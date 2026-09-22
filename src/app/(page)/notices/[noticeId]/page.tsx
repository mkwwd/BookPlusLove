import Link from 'next/link';

import NoticeDeleteButton from '@/components/NoticeDeleteButton';
import NoticeViews from '@/components/NoticeViews';
import { formatNoticeDate } from '@/lib/notices';
import { requireAdmin } from '@/utils/supabase/admin';
import { getNotice } from '@/utils/supabase/notice';

export default async function NoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const isAdmin = !(await requireAdmin()).error;
  const { noticeId } = await params;
  const notice = await getNotice(noticeId, isAdmin);
  return (
    <main className="page-bg min-h-screen px-4 py-8 sm:px-8">
      <article className="mx-auto max-w-5xl text-amber-950">
        <header className="border-b border-amber-900/20 pb-6">
          <h1 className="font-serif text-3xl break-words">{notice.title}</h1>
          <div className="mt-4 flex flex-wrap gap-5 text-base text-amber-900/70">
            <span>작성자: 관리자</span>
            <NoticeViews
              key={notice.id}
              id={notice.id}
              initialCount={notice.view_count}
              published={notice.is_published}
            />
            {notice.is_pinned && <span>공지</span>}
            <span>작성일: {formatNoticeDate(notice.published_at)}</span>
            {!notice.is_published && <span>비공개</span>}
          </div>
        </header>
        <div className="min-h-64 py-8 text-lg leading-relaxed break-words whitespace-pre-wrap">
          {notice.content}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-amber-900/20 pt-5">
          <Link
            href="/notices"
            className="rounded border border-amber-900/20 px-5 py-3">
            목록으로
          </Link>
          {isAdmin && (
            <div className="flex gap-3">
              <Link
                href={`/notices/${notice.id}/edit`}
                className="rounded bg-red-900 px-5 py-3 text-white">
                수정
              </Link>
              <NoticeDeleteButton id={notice.id} />
            </div>
          )}
        </footer>
      </article>
    </main>
  );
}
