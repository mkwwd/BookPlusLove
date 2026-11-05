const CATEGORY_COLORS: Record<string, string> = {
  '000': '#FFEA5E',
  '100': '#FA6728',
  '200': '#D6D5D4',
  '300': '#14A9FF',
  '400': '#0089D9',
  '500': '#78D44A',
  '600': '#FFB0B9',
  '700': '#FFCA45',
  '800': '#157300',
  '900': '#B88F53',
};

export function normalizeCategoryColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const color = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}(FF)?$/.test(color) ? color.slice(0, 7) : null;
}

export function categoryColor(code: string, color?: unknown): string {
  return normalizeCategoryColor(color) ?? CATEGORY_COLORS[code] ?? '#D6D5D4';
}

export function categoryTextColor(color: string): string {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
    ? '#000000'
    : '#FFFFFF';
}
