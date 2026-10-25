export const NOTICE_PAGE_SIZE = 10;

export function noticePage(value?: string) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function noticePageCount(count: number) {
  return Math.max(1, Math.ceil(count / NOTICE_PAGE_SIZE));
}

export function noticeSearchPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

export function noticeListUrl(page: number, field: string, q: string) {
  return `/notices?${new URLSearchParams({ page: String(page), field, q })}`;
}
