import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Pencil,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';

import {
  NOTICE_PAGE_SIZE,
  noticeListUrl,
  noticePage,
  noticePageCount,
  noticeSearchPattern,
} from '@/lib/noticeBoard';
import { formatNoticeDate } from '@/lib/notices';
import { requireAdmin } from '@/utils/supabase/admin';
import { supabaseServer } from '@/utils/supabase/server';

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; field?: string; q?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const field = params.field === 'content' ? 'content' : 'title';
  const isAdmin = !(await requireAdmin()).error;
  function query(pinned: boolean) {
    let request = supabaseServer
      .from('notices')
      .select('id, title, published_at, is_pinned, is_published, view_count', {
        count: 'exact',
      })
      .eq('is_pinned', pinned)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false });
    if (!isAdmin) request = request.eq('is_published', true);
    if (q) request = request.ilike(field, noticeSearchPattern(q));
    return request;
  }
  const pinned = await query(true);
  const totals = await query(false).limit(0);
  const totalPages = noticePageCount(totals.count ?? 0);
  const page = Math.min(noticePage(params.page), totalPages);
  const offset = (page - 1) * NOTICE_PAGE_SIZE;
  const regular = await query(false).range(
    offset,
    offset + NOTICE_PAGE_SIZE - 1,
  );
  const failed = pinned.error || totals.error || regular.error;
  const notices = [...(pinned.data ?? []), ...(regular.data ?? [])];
  const total = (pinned.count ?? 0) + (totals.count ?? 0);
  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => startPage + index,
  );
  const pageUrl = (value: number) => noticeListUrl(value, field, q);
  return (
    <main className="page-bg min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 pt-8 pb-32 sm:px-8 lg:px-12">
        <header className="mb-8 border-b border-amber-900/15 pb-5">
          <h1 className="font-serif text-3xl font-black text-amber-950 sm:text-4xl">
            공지사항
          </h1>
          <p className="mt-2 text-base text-amber-900/70">
            도서관 운영 안내와 새 소식을 확인하세요.
          </p>
        </header>
        {isAdmin && (
          <Link
            href="/notices/new"
            aria-label="글 작성하기"
            title="글 작성하기"
            className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-red-900 text-lg text-white shadow-lg transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-900 sm:right-8 sm:w-auto sm:rounded-lg sm:px-5">
            <Pencil aria-hidden="true" className="h-6 w-6 shrink-0" />
            <span className="hidden sm:inline">글 작성하기</span>
          </Link>
        )}
        <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <p className="order-2 text-lg text-amber-950 sm:order-1">
            {q ? '검색 결과' : '전체'}{' '}
            <strong>{failed ? '-' : total.toLocaleString('ko-KR')}</strong>건
          </p>
          <form
            action="/notices"
            className="order-1 flex min-w-0 gap-3 sm:order-2">
            <select
              name="field"
              defaultValue={field}
              aria-label="검색 항목"
              className="w-24 shrink-0 border-b border-amber-900/40 bg-transparent py-2 text-base text-amber-950">
              <option value="title">제목</option>
              <option value="content">내용</option>
            </select>
            <div className="flex min-w-0 flex-1 border-b border-amber-900/40">
              <input
                name="q"
                defaultValue={q}
                maxLength={100}
                aria-label="검색어"
                placeholder="검색어"
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-amber-950 sm:w-64"
              />
              <button
                aria-label="검색"
                title="검색"
                className="shrink-0 p-2 text-red-900">
                <Search className="h-6 w-6" />
              </button>
            </div>
            {q && (
              <Link
                href="/notices"
                className="shrink-0 self-center text-sm text-amber-900 underline">
                초기화
              </Link>
            )}
          </form>
        </div>
        {failed ? (
          <p role="alert" className="py-10 text-center text-red-800">
            공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : (
          <>
            <section
              aria-label="공지사항 목록"
              className="border-t-2 border-amber-950/70 text-amber-950">
              <div className="hidden grid-cols-[5rem_minmax(0,1fr)_7rem_9rem_5rem] border-b border-amber-900/40 py-4 text-center text-base font-bold md:grid">
                <span>번호</span>
                <span>제목</span>
                <span>작성자</span>
                <span>작성일</span>
                <span>조회수</span>
              </div>
              {notices.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center border-b border-amber-900/15 px-5 py-16 text-center">
                  <Megaphone className="mb-4 h-10 w-10 text-amber-800/50" />
                  <p className="text-xl font-bold">
                    {q ? '검색 결과가 없습니다' : '등록된 공지사항이 없습니다'}
                  </p>
                  {!q && (
                    <p className="mt-2 text-base text-amber-900/65">
                      새로운 공지가 등록되면 이곳에 표시됩니다.
                    </p>
                  )}
                </div>
              ) : (
                <ul>
                  {notices.map((notice, index) => (
                    <li
                      key={notice.id}
                      className={`grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-y-2 border-b border-amber-900/15 px-2 py-5 md:grid-cols-[5rem_minmax(0,1fr)_7rem_9rem_5rem] md:px-0 ${notice.is_pinned ? 'bg-red-900/[0.03]' : ''}`}>
                      <span className="text-center text-sm text-amber-900/65">
                        {notice.is_pinned ? (
                          <span className="rounded bg-red-900 px-2 py-1 text-sm text-white">
                            공지
                          </span>
                        ) : (
                          (totals.count ?? 0) -
                          offset -
                          (index - (pinned.data?.length ?? 0))
                        )}
                      </span>
                      <Link
                        href={`/notices/${notice.id}`}
                        className="min-w-0 pr-3 text-lg font-medium break-words hover:underline">
                        {notice.title}
                        {!notice.is_published && (
                          <span className="ml-2 text-sm text-amber-900/60">
                            (비공개)
                          </span>
                        )}
                      </Link>
                      <div className="col-start-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-amber-900/65 md:contents">
                        <span className="md:text-center md:text-base">
                          관리자
                        </span>
                        <time
                          className="md:text-center md:text-base"
                          dateTime={notice.published_at}>
                          {formatNoticeDate(notice.published_at)}
                        </time>
                        <span className="md:text-center md:text-base">
                          <span className="md:hidden">조회 </span>
                          {Number(notice.view_count).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <nav
              aria-label="공지사항 페이지"
              className="mt-8 flex items-center justify-center gap-1 sm:gap-2">
              {page > 1 ? (
                <Link
                  href={pageUrl(page - 1)}
                  aria-label="이전 페이지"
                  className="p-2">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  aria-label="이전 페이지"
                  className="p-2 opacity-30">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              )}
              {pages.map((value) => (
                <Link
                  key={value}
                  href={pageUrl(value)}
                  aria-current={value === page ? 'page' : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded text-base ${value === page ? 'bg-red-900 text-white' : 'text-amber-950 hover:bg-red-900/5'}`}>
                  {value}
                </Link>
              ))}
              {page < totalPages ? (
                <Link
                  href={pageUrl(page + 1)}
                  aria-label="다음 페이지"
                  className="p-2">
                  <ChevronRight className="h-5 w-5" />
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  aria-label="다음 페이지"
                  className="p-2 opacity-30">
                  <ChevronRight className="h-5 w-5" />
                </span>
              )}
            </nav>
          </>
        )}
      </div>
    </main>
  );
}
