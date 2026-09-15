import { Megaphone } from 'lucide-react';
import { connection } from 'next/server';

import NoticeManager from '@/components/NoticeManager';
import { formatNoticeDate } from '@/lib/notices';
import { supabaseServer } from '@/utils/supabase/server';

interface Notice {
  id: number;
  title: string;
  content: string;
  published_at: string | null;
}

async function getNotices(): Promise<Notice[]> {
  const { data } = await supabaseServer
    .from('notices')
    .select('id, title, content, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return data ?? [];
}

function excerpt(content: string) {
  return content.replace(/\s+/g, ' ').slice(0, 120);
}

export default async function NoticesPage() {
  await connection();

  const notices = await getNotices();

  return (
    <main className="page-bg min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 pt-8 pb-16 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center justify-between border-b border-amber-900/15 pb-5">
          <div>
            <h1 className="font-serif text-3xl font-black text-amber-950 sm:text-4xl">
              공지사항
            </h1>
            <p className="mt-2 text-base text-amber-900/70">
              도서관 운영 안내와 새 소식을 확인하세요.
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-amber-900/15 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-[1fr_auto_auto] border-b border-amber-900/15 bg-amber-50/80 px-5 py-3 text-base font-bold text-amber-900">
            <span>제목</span>
            <span className="hidden w-28 text-center sm:block">작성자</span>
            <span className="w-28 text-right">작성일</span>
          </div>

          {notices.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 py-16 text-center">
              <Megaphone className="mb-4 h-10 w-10 text-amber-800/50" />
              <p className="text-xl font-bold text-amber-950">
                등록된 공지사항이 없습니다
              </p>
              <p className="mt-2 text-base text-amber-900/65">
                새로운 공지가 등록되면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-amber-900/10">
              {notices.map((notice) => (
                <li
                  key={notice.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center px-5 py-4 text-base">
                  <div className="min-w-0">
                    <p className="font-semibold text-amber-950">
                      {notice.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-amber-900/65">
                      {excerpt(notice.content)}
                    </p>
                  </div>
                  <span className="hidden w-28 text-center text-amber-900/70 sm:block">
                    관리자
                  </span>
                  <time
                    className="w-28 text-right text-amber-900/70"
                    dateTime={notice.published_at ?? undefined}>
                    {formatNoticeDate(notice.published_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <NoticeManager hideWhenForbidden showHeading />
      </div>
    </main>
  );
}
