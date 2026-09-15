export interface NoticeInput {
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt: string;
}

export function normalizeNoticeInput(
  body: unknown,
): { ok: true; value: NoticeInput } | { ok: false; error: string } {
  const data = body as Record<string, unknown> | null;
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const content = typeof data?.content === 'string' ? data.content.trim() : '';
  const isPublished =
    typeof data?.isPublished === 'boolean' ? data.isPublished : true;
  const publishedAt =
    typeof data?.publishedAt === 'string' ? data.publishedAt.trim() : '';

  if (!title) return { ok: false, error: '제목을 입력해주세요.' };
  if (!content) return { ok: false, error: '내용을 입력해주세요.' };
  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) {
    return { ok: false, error: '게시일이 올바르지 않습니다.' };
  }

  return {
    ok: true,
    value: {
      title,
      content,
      isPublished,
      publishedAt: publishedAt || new Date().toISOString(),
    },
  };
}

export function formatNoticeDate(value: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
