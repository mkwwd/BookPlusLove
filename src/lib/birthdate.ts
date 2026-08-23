const CURRENT_YEAR = new Date().getFullYear();

export const BIRTH_YEARS = Array.from(
  { length: 111 },
  (_, i) => CURRENT_YEAR - i,
);
export const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function getDaysInMonth(year: string, month: string): number {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

export function formatBirthdate(
  year: string,
  month: string,
  day: string,
): string {
  if (!year || !month || !day) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseBirthdate(value: string | null): {
  year: string;
  month: string;
  day: string;
} {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { year: '', month: '', day: '' };
  const [, year, month, day] = match;
  return { year, month: String(Number(month)), day: String(Number(day)) };
}
