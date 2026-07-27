import { BookShape } from '@/components/BookCard';

const LIBRARY_NAME = '광주가톨릭평생교육원';

const STATUS_STYLE: Record<string, string> = {
  대여가능: 'bg-green-100 text-green-800',
  대여중: 'bg-yellow-100 text-yellow-800',
  분실: 'bg-gray-200 text-gray-700',
  폐기: 'bg-gray-200 text-gray-700',
};

export interface BookSearchResultCopy {
  id: number;
  regNo: string;
  status: string;
}

export interface BookSearchResultData {
  id: number;
  title: string;
  author: string | null;
  publisher: string | null;
  coverUrl: string | null;
  pubDate: string | null;
  categoryCode: string | null;
  authorCode: string | null;
  copies: BookSearchResultCopy[];
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

function BookThumbnail({
  title,
  coverUrl,
}: {
  title: string;
  coverUrl: string | null;
}) {
  return (
    <div className="mx-auto w-24 shrink-0 sm:mx-0">
      <BookShape>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`${title} 표지`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-950 to-amber-950">
            <span
              aria-hidden="true"
              className="font-serif text-2xl font-bold text-amber-100/40">
              ×
            </span>
          </div>
        )}
      </BookShape>
    </div>
  );
}

export function BookSearchResultRow({ book }: { book: BookSearchResultData }) {
  const year = extractYear(book.pubDate);
  const callNumber = buildCallNumber(book.categoryCode, book.authorCode);

  return (
    <article className="flex flex-col gap-6 p-6 sm:flex-row sm:gap-8 sm:p-8">
      <BookThumbnail title={book.title} coverUrl={book.coverUrl} />

      <div className="min-w-0 flex-1">
        <h2 className="text-2xl leading-tight font-bold break-keep text-red-900 sm:text-3xl">
          {book.title}
        </h2>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-base text-amber-950/70 sm:text-lg">
          {book.author && <span>{book.author} 지음</span>}
          {book.publisher && <span>{book.publisher}</span>}
          {callNumber && <span>{callNumber}</span>}
          {year && <span>{year}</span>}
        </div>

        <div className="mt-7 overflow-x-auto">
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
                      {copy.regNo}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-md px-3 py-1.5 text-base font-semibold ${
                          STATUS_STYLE[copy.status] ??
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
    </article>
  );
}
