import { redirect } from 'next/navigation';

import NoticeEditor from '@/components/NoticeEditor';
import { requireAdmin } from '@/utils/supabase/admin';
import { getNotice } from '@/utils/supabase/notice';

export default async function EditNoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  if ((await requireAdmin()).error) redirect('/notices');
  const { noticeId } = await params;
  const notice = await getNotice(noticeId, true);
  return (
    <NoticeEditor
      notice={{
        id: notice.id,
        title: notice.title,
        content: notice.content,
        isPublished: notice.is_published,
        isPinned: notice.is_pinned,
        publishedAt: notice.published_at,
      }}
    />
  );
}
