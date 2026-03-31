import { PaletteColor, hexToRgb } from './pixelation';
import colorSystemMapping from '../app/colorSystemMapping.json';

export type ColorSystem = 'MARD' | 'COCO';

type ColorMapping = Record<string, Record<string, string>>;
const typedColorSystemMapping = colorSystemMapping as ColorMapping;

export const colorSystemOptions: { key: ColorSystem; name: string }[] = [
  { key: 'MARD', name: 'MARD' },
  { key: 'COCO', name: 'COCO' },
];

export function getMardToHexMapping(): Record<string, string> {
  const mapping: Record<string, string> = {};
  Object.entries(typedColorSystemMapping).forEach(([hex, colorData]) => {
    const mardKey = colorData.MARD;
    if (mardKey) {
      mapping[mardKey] = hex;
    }
  });
  return mapping;
}

export function getDisplayColorKey(
  hexValue: string,
  colorSystem: ColorSystem
): string {
  if (hexValue === 'ERASE' || hexValue.length === 0 || hexValue === '?') {
    return hexValue;
  }

  const normalizedHex = hexValue.toUpperCase();
  const colorMapping = typedColorSystemMapping[normalizedHex];
  if (colorMapping && colorMapping[colorSystem]) {
    return colorMapping[colorSystem];
  }

  return '?';
}

export function buildFullPalette(): PaletteColor[] {
  const mardToHex = getMardToHexMapping();
  return Object.entries(mardToHex)
    .map(([, hex]) => {
      const rgb = hexToRgb(hex);
      if (!rgb) return null;
      return { key: hex, hex, rgb };
    })
    .filter((color): color is PaletteColor => color !== null);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function sortColorsByHue<T extends { color: string }>(
  colors: T[]
): T[] {
  return colors.slice().sort((a, b) => {
    const hslA = hexToHsl(a.color);
    const hslB = hexToHsl(b.color);

    if (Math.abs(hslA.h - hslB.h) > 5) {
      return hslA.h - hslB.h;
    }
    if (Math.abs(hslA.l - hslB.l) > 3) {
      return hslB.l - hslA.l;
    }
    return hslB.s - hslA.s;
  });
}
