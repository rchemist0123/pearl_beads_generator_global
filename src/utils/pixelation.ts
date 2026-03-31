export enum PixelationMode {
  Dominant = 'dominant',
  Average = 'average',
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor {
  key: string;
  hex: string;
  rgb: RgbColor;
}

export interface MappedPixel {
  key: string;
  color: string;
  isExternal?: boolean;
}

export const TRANSPARENT_KEY = 'ERASE';

export const transparentColorData: MappedPixel = {
  key: TRANSPARENT_KEY,
  color: '#FFFFFF',
  isExternal: true,
};

export function hexToRgb(hex: string): RgbColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function colorDistance(rgb1: RgbColor, rgb2: RgbColor): number {
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function findClosestPaletteColor(
  targetRgb: RgbColor,
  palette: PaletteColor[]
): PaletteColor {
  if (!palette || palette.length === 0) {
    return { key: 'ERR', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } };
  }

  let minDistance = Infinity;
  let closestColor = palette[0];

  for (const paletteColor of palette) {
    const distance = colorDistance(targetRgb, paletteColor.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = paletteColor;
    }
    if (distance === 0) break;
  }
  return closestColor;
}

function calculateCellRepresentativeColor(
  imageData: ImageData,
  startX: number,
  startY: number,
  width: number,
  height: number,
  mode: PixelationMode
): RgbColor | null {
  const data = imageData.data;
  const imgWidth = imageData.width;
  let rSum = 0,
    gSum = 0,
    bSum = 0;
  let pixelCount = 0;
  const colorCountsInCell: { [key: string]: number } = {};
  let dominantColorRgb: RgbColor | null = null;
  let maxCount = 0;

  const endX = startX + width;
  const endY = startY + height;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * imgWidth + x) * 4;
      if (data[index + 3] < 128) continue;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];

      pixelCount++;

      if (mode === PixelationMode.Average) {
        rSum += r;
        gSum += g;
        bSum += b;
      } else {
        const colorKey = `${r},${g},${b}`;
        colorCountsInCell[colorKey] = (colorCountsInCell[colorKey] || 0) + 1;
        if (colorCountsInCell[colorKey] > maxCount) {
          maxCount = colorCountsInCell[colorKey];
          dominantColorRgb = { r, g, b };
        }
      }
    }
  }

  if (pixelCount === 0) return null;

  if (mode === PixelationMode.Average) {
    return {
      r: Math.round(rSum / pixelCount),
      g: Math.round(gSum / pixelCount),
      b: Math.round(bSum / pixelCount),
    };
  } else {
    return dominantColorRgb;
  }
}

export function calculatePixelGrid(
  originalCtx: CanvasRenderingContext2D,
  imgWidth: number,
  imgHeight: number,
  N: number,
  M: number,
  palette: PaletteColor[],
  mode: PixelationMode,
  t1FallbackColor: PaletteColor
): MappedPixel[][] {
  const mappedData: MappedPixel[][] = Array(M)
    .fill(null)
    .map(() =>
      Array(N).fill({ key: t1FallbackColor.key, color: t1FallbackColor.hex })
    );
  const cellWidthOriginal = imgWidth / N;
  const cellHeightOriginal = imgHeight / M;

  let fullImageData: ImageData | null = null;
  try {
    fullImageData = originalCtx.getImageData(0, 0, imgWidth, imgHeight);
  } catch {
    return mappedData;
  }

  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const startXOriginal = Math.floor(i * cellWidthOriginal);
      const startYOriginal = Math.floor(j * cellHeightOriginal);
      const endXOriginal = Math.min(
        imgWidth,
        Math.ceil((i + 1) * cellWidthOriginal)
      );
      const endYOriginal = Math.min(
        imgHeight,
        Math.ceil((j + 1) * cellHeightOriginal)
      );
      const currentCellWidth = Math.max(1, endXOriginal - startXOriginal);
      const currentCellHeight = Math.max(1, endYOriginal - startYOriginal);

      const representativeRgb = calculateCellRepresentativeColor(
        fullImageData,
        startXOriginal,
        startYOriginal,
        currentCellWidth,
        currentCellHeight,
        mode
      );

      if (representativeRgb) {
        const closestBead = findClosestPaletteColor(representativeRgb, palette);
        mappedData[j][i] = { key: closestBead.key, color: closestBead.hex };
      } else {
        mappedData[j][i] = { ...transparentColorData };
      }
    }
  }
  return mappedData;
}

export function removeBackground(
  mappedData: MappedPixel[][],
  gridDimensions: { N: number; M: number },
  similarityThreshold: number
): MappedPixel[][] {
  const { N, M } = gridDimensions;
  const newData = mappedData.map((row) => row.map((cell) => ({ ...cell })));
  const visited = Array(M)
    .fill(null)
    .map(() => Array(N).fill(false));

  // Get corner colors to determine background color
  const corners = [
    newData[0]?.[0],
    newData[0]?.[N - 1],
    newData[M - 1]?.[0],
    newData[M - 1]?.[N - 1],
  ].filter((c) => c && !c.isExternal);

  if (corners.length === 0) return newData;

  // Find the most common corner color
  const cornerColorCounts: { [key: string]: number } = {};
  corners.forEach((c) => {
    const key = c.color.toUpperCase();
    cornerColorCounts[key] = (cornerColorCounts[key] || 0) + 1;
  });

  let bgColor = corners[0].color.toUpperCase();
  let maxCount = 0;
  for (const [color, count] of Object.entries(cornerColorCounts)) {
    if (count > maxCount) {
      maxCount = count;
      bgColor = color;
    }
  }

  const bgRgb = hexToRgb(bgColor);
  if (!bgRgb) return newData;

  // Flood fill from all edges
  const stack: { row: number; col: number }[] = [];

  // Add all edge cells to the stack
  for (let i = 0; i < N; i++) {
    stack.push({ row: 0, col: i });
    stack.push({ row: M - 1, col: i });
  }
  for (let j = 1; j < M - 1; j++) {
    stack.push({ row: j, col: 0 });
    stack.push({ row: j, col: N - 1 });
  }

  while (stack.length > 0) {
    const { row, col } = stack.pop()!;

    if (row < 0 || row >= M || col < 0 || col >= N || visited[row][col]) {
      continue;
    }

    const currentCell = newData[row][col];
    if (!currentCell || currentCell.isExternal) {
      visited[row][col] = true;
      continue;
    }

    const cellRgb = hexToRgb(currentCell.color);
    if (!cellRgb) {
      visited[row][col] = true;
      continue;
    }

    const distance = colorDistance(bgRgb, cellRgb);
    if (distance > similarityThreshold) {
      continue;
    }

    visited[row][col] = true;
    newData[row][col] = { ...transparentColorData };

    stack.push(
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 }
    );
  }

  return newData;
}

export function recalculateColorStats(mappedData: MappedPixel[][]): {
  colorCounts: { [hexKey: string]: { count: number; color: string } };
  totalCount: number;
} {
  const colorCounts: { [hexKey: string]: { count: number; color: string } } =
    {};
  let totalCount = 0;

  mappedData.flat().forEach((cell) => {
    if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
      const cellHex = cell.color.toUpperCase();
      if (!colorCounts[cellHex]) {
        colorCounts[cellHex] = { count: 0, color: cellHex };
      }
      colorCounts[cellHex].count++;
      totalCount++;
    }
  });

  return { colorCounts, totalCount };
}
