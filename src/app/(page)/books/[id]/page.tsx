import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BookShape } from '@/components/BookCard';
import { BOOK_COPY_STATUS_STYLE, LIBRARY_NAME } from '@/lib/bookCopy';
import { supabaseServer } from '@/utils/supabase/server';

interface BookCategoryRow {
  label: string;
  main_code: string;
  main_label: string;
}

interface BookCopyRow {
  id: number;
  reg_no: string;
  status: string;
}

interface BookRow {
  id: number;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_url: string | null;
  description: string | null;
  page: string | null;
  price: string | null;
  pub_date: string | null;
  category_code: string | null;
  author_code: string | null;
  aladin_item_id: number | null;
  book_categories: BookCategoryRow | BookCategoryRow[] | null;
  book_copies: BookCopyRow[] | null;
}

interface BookDetail {
  id: number;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  coverUrl: string | null;
  description: string | null;
  page: string | null;
  price: string | null;
  pubDate: string | null;
  categoryCode: string | null;
  authorCode: string | null;
  categoryLabel: string | null;
  aladinItemId: number | null;
  copies: BookCopyRow[];
}

async function getBook(id: number): Promise<BookDetail | null> {
  const { data } = await supabaseServer
    .from('books')
    .select(
      `id, isbn, title, author, publisher, cover_url, description, page, price, pub_date, category_code, author_code, aladin_item_id,
      book_categories(label, main_code, main_label),
      book_copies(id, reg_no, status)`,
    )
    .eq('id', id)
    .maybeSingle<BookRow>();

  if (!data) return null;

  const category = data.book_categories
    ? Array.isArray(data.book_categories)
      ? data.book_categories[0]
      : data.book_categories
    : null;

  return {
    id: data.id,
    isbn: data.isbn,
    title: data.title,
    author: data.author,
    publisher: data.publisher,
    coverUrl: data.cover_url,
    description: data.description,
    page: data.page,
    price: data.price,
    pubDate: data.pub_date,
    categoryCode: data.category_code,
    authorCode: data.author_code,
    categoryLabel: category
      ? `${category.main_label} > ${category.label}`
      : null,
    aladinItemId: data.aladin_item_id,
    copies: data.book_copies ?? [],
  };
}

function extractYear(pubDate: string | null): string | null {
  return pubDate?.match(/\d{4}/)?.[0] ?? null;
}

function buildCallNumber(
  categoryCode: string | null,
  authorCode: string | null,
) {
  return [categoryCode, authorCode].filter(Boolean).join(' ');
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookId = Number(id);

  if (!Number.isInteger(bookId) || bookId < 0) {
    notFound();
  }

  const book = await getBook(bookId);
  if (!book) {
    notFound();
  }

  const year = extractYear(book.pubDate);
  const callNumber = buildCallNumber(book.categoryCode, book.authorCode);

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 pt-6 pb-12 sm:px-8 sm:pt-8 sm:pb-16 lg:px-12">
        <Link
          href="/books"
          className="mb-6 inline-block text-amber-900/70 hover:underline">
          ← 도서 검색으로
        </Link>

        <div className="rounded-lg border border-amber-900/10 bg-white/70 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-56">
              <BookShape>
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt={`${book.title} 표지`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-950 to-amber-900">
                    <span className="font-serif text-5xl font-bold text-amber-100/40">
                      ?
                    </span>
                  </div>
                )}
              </BookShape>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-3xl leading-tight font-bold break-keep text-red-900 sm:text-4xl">
                {book.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-base text-amber-950/70 sm:text-lg">
                {book.author && <span>{book.author} 지음</span>}
                {book.publisher && <span>{book.publisher}</span>}
                {year && <span>{year}</span>}
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 text-base text-amber-950/80 sm:grid-cols-2">
                {book.categoryLabel && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-amber-900/50">분류</dt>
                    <dd>{book.categoryLabel}</dd>
                  </div>
                )}
                {callNumber && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-amber-900/50">청구기호</dt>
                    <dd className="tabular-nums">{callNumber}</dd>
                  </div>
                )}
                {book.isbn && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-amber-900/50">ISBN</dt>
                    <dd className="tabular-nums">{book.isbn}</dd>
                  </div>
                )}
                {book.page && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-amber-900/50">쪽수</dt>
                    <dd>{book.page}쪽</dd>
                  </div>
                )}
                {book.price && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-amber-900/50">정가</dt>
                    <dd>{book.price}원</dd>
                  </div>
                )}
              </dl>

              {book.description && (
                <p className="mt-6 leading-7 whitespace-pre-line text-amber-950/80">
                  {book.description}
                </p>
              )}

              {book.aladinItemId && (
                <p className="mt-4 text-sm text-amber-900/50">
                  정보제공: 알라딘 ·{' '}
                  <a
                    href={`https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=${book.aladinItemId}&partner=openAPI`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900/80">
                    상품 페이지 보기
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-base sm:text-lg">
              <thead>
                <tr className="border-b border-amber-900/15 text-left text-sm text-amber-900/55 sm:text-base">
                  <th className="py-2 pr-4 font-medium">자료실/서가</th>
                  <th className="py-2 pr-4 font-medium">청구기호</th>
                  <th className="py-2 pr-4 font-medium">등록번호</th>
                  <th className="py-2 font-medium">도서상태</th>
                </tr>
              </thead>
              <tbody>
                {book.copies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-amber-700/60">
                      등록된 소장 정보가 없습니다.
                    </td>
                  </tr>
                ) : (
                  book.copies.map((copy) => (
                    <tr
                      key={copy.id}
                      className="border-b border-amber-900/5 last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-amber-950/80">
                        {LIBRARY_NAME}
                      </td>
                      <td className="py-3 pr-4 text-amber-950/80 tabular-nums">
                        {callNumber || '-'}
                      </td>
                      <td className="py-3 pr-4 text-amber-950/80 tabular-nums">
                        {copy.reg_no}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-md px-3 py-1.5 text-base font-semibold ${
                            BOOK_COPY_STATUS_STYLE[copy.status] ??
                            'bg-gray-200 text-gray-700'
                          }`}>
                          {copy.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
