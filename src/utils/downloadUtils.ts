import { MappedPixel } from './pixelation';
import { getDisplayColorKey, ColorSystem } from './colorSystem';

export function downloadPattern(
  mappedPixelData: MappedPixel[][],
  gridDimensions: { N: number; M: number },
  colorSystem: ColorSystem
): void {
  const { N, M } = gridDimensions;
  const cellSize = 30;
  const headerHeight = 30;
  const padding = 10;
  const canvasWidth = N * cellSize + padding * 2;
  const canvasHeight = M * cellSize + padding * 2 + headerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Header
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `Pearl Beads Pattern (${N}×${M})`,
    canvasWidth / 2,
    headerHeight - 10
  );

  const offsetX = padding;
  const offsetY = padding + headerHeight;

  // Draw cells
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const cell = mappedPixelData[j]?.[i];
      if (!cell) continue;

      const x = offsetX + i * cellSize;
      const y = offsetY + j * cellSize;

      if (cell.isExternal) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = cell.color;
      }
      ctx.fillRect(x, y, cellSize, cellSize);

      // Grid lines
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);

      // Color code text
      if (!cell.isExternal) {
        const displayKey = getDisplayColorKey(cell.color, colorSystem);
        const rgb = {
          r: parseInt(cell.color.slice(1, 3), 16),
          g: parseInt(cell.color.slice(3, 5), 16),
          b: parseInt(cell.color.slice(5, 7), 16),
        };
        const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
        ctx.fillStyle = luma > 0.5 ? '#000000' : '#FFFFFF';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(displayKey, x + cellSize / 2, y + cellSize / 2 + 3);
      }
    }
  }

  // Section lines every 10 cells
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  for (let i = 0; i <= N; i += 10) {
    const x = offsetX + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, offsetY);
    ctx.lineTo(x, offsetY + M * cellSize);
    ctx.stroke();
  }
  for (let j = 0; j <= M; j += 10) {
    const y = offsetY + j * cellSize;
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + N * cellSize, y);
    ctx.stroke();
  }

  // Download
  const link = document.createElement('a');
  link.download = `pearl-beads-pattern-${N}x${M}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
