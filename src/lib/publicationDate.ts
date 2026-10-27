// null means absent; undefined means invalid. Never invent missing components.
export function normalizePublicationDate(
  value: unknown,
): string | null | undefined {
  if (value == null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return null;

  const parts =
    text.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/) ??
    text.match(/^(\d{4})\s*년(?:\s*(\d{1,2})\s*월(?:\s*(\d{1,2})\s*일)?)?$/) ??
    text.match(/^(\d{4})\.(\d{1,2})(?:\.(\d{1,2}))?\.?$/) ??
    text.match(/^(\d{4})\/(\d{1,2})(?:\/(\d{1,2}))?$/) ??
    text.match(/^(\d{4})(\d{2})(\d{2})?$/);
  if (!parts) return undefined;
  const [, year, month, day] = parts;
  if (Number(year) === 0) return undefined;
  if (!month) return year;
  if (Number(month) < 1 || Number(month) > 12) return undefined;
  const yearMonth = `${year}-${month.padStart(2, '0')}`;
  if (!day) return yearMonth;

  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  )
    return undefined;
  return `${yearMonth}-${day.padStart(2, '0')}`;
}

export function formatPublicationDate(
  value: string | null | undefined,
): string {
  const normalized = normalizePublicationDate(value);
  return normalized === undefined ? (value ?? '') : (normalized ?? '');
}

export function formatKoreanPublicationDate(
  value: string | null | undefined,
): string {
  const normalized = normalizePublicationDate(value);
  if (normalized === undefined) return value ?? '';
  if (normalized === null) return '';
  const [year, month, day] = normalized.split('-');
  return `${year}년${month ? ` ${month}월` : ''}${day ? ` ${day}일` : ''}`;
}
