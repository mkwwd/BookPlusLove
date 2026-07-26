import type { ReactNode } from 'react';

import { BookOpen, Cross } from 'lucide-react';

export interface BookCardData {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
}

const PAGE_THICKNESS = 8;

function BookShape({ children }: { children: ReactNode }) {
  return (
    <div className="group relative aspect-[5/6] w-full max-w-40 shrink-0 [perspective:1200px]">
      {/* 책 아래 그림자 */}
      <div
        aria-hidden="true"
        className="absolute -bottom-4 left-1/2 h-4 w-[76%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(65,35,15,0.32)_0%,rgba(65,35,15,0)_72%)] opacity-50 blur-[2px] transition-all duration-700 group-hover:w-[88%] group-hover:opacity-70"
      />

      {/* 책 전체 */}
      <div className="relative h-full w-full [transform:rotateY(-18deg)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(-11deg)_translateY(-4px)]">
        {/* 뒷표지 */}
        <div
          aria-hidden="true"
          className="absolute inset-y-[1%] right-[-7%] left-[2%] z-0 rounded-r-[7px] bg-gradient-to-br from-amber-950 to-amber-900 shadow-[6px_8px_16px_rgba(60,30,10,0.28)]"
        />

        {/* 책 안쪽 페이지 */}
        <div
          aria-hidden="true"
          className="absolute inset-y-[2.5%] right-[-2%] left-[4%] z-10">
          {/* 가장 뒤 페이지 */}
          <div className="absolute inset-0 translate-x-[3px] rounded-r-[5px] border border-amber-900/10 bg-amber-100 shadow-[1px_2px_3px_rgba(70,40,20,0.14)] transition-transform duration-700 group-hover:translate-x-[4px]" />

          {/* 가운데 페이지 */}
          <div className="absolute inset-y-[1px] right-[2px] left-0 translate-x-[2px] rounded-r-[5px] border border-amber-900/10 bg-amber-50 shadow-[1px_1px_2px_rgba(70,40,20,0.1)] transition-transform duration-700 group-hover:translate-x-[3px]" />

          {/* 앞쪽 페이지 */}
          <div className="absolute inset-y-[2px] right-[4px] left-0 translate-x-[1px] rounded-r-[5px] border border-amber-900/10 bg-[#fffdf7] shadow-[1px_1px_2px_rgba(70,40,20,0.08)] transition-transform duration-700 group-hover:translate-x-[2px]" />
        </div>

        {/* 오른쪽 페이지 두께 */}
        <div
          aria-hidden="true"
          className="absolute top-[3%] right-0 z-10 h-[94%] rounded-r-[3px] bg-gradient-to-b [background-image:repeating-linear-gradient(to_bottom,rgba(120,90,50,0.25)_0px,rgba(120,90,50,0.25)_1px,transparent_1px,transparent_3px)] from-amber-50 via-amber-100 to-amber-50"
          style={{
            width: `${PAGE_THICKNESS}px`,
            transformOrigin: 'left center',
            transform: `translateX(${PAGE_THICKNESS}px) rotateY(90deg)`,
          }}
        />

        {/* 앞표지 */}
        <div className="absolute inset-0 z-20 [transform-origin:left_center] overflow-hidden rounded-[3px_8px_8px_3px] shadow-[8px_8px_18px_rgba(70,35,15,0.22),16px_2px_24px_rgba(70,35,15,0.12)] ring-1 ring-black/10 transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [backface-visibility:hidden] group-hover:[transform:translateX(-5px)_rotateY(-3deg)] group-hover:shadow-[14px_10px_24px_rgba(70,35,15,0.28),22px_4px_30px_rgba(70,35,15,0.16)]">
          {/* 표지 콘텐츠 */}
          <div className="absolute inset-0">{children}</div>

          {/* 책등 음영 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 border-r border-black/10 bg-gradient-to-r from-black/25 via-black/10 to-transparent transition-all duration-700 group-hover:w-6"
          />

          {/* 책등 하이라이트 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[7px] z-10 w-px bg-white/25"
          />

          {/* 표지 전체 음영 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black/10 via-transparent to-white/15"
          />

          {/* 지나가는 광택 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-[80%] z-20 w-[65%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-[left] duration-1000 ease-out group-hover:left-[120%]"
          />

          {/* 오른쪽 표지 테두리 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-20 w-px bg-black/15"
          />
        </div>
      </div>
    </div>
  );
}

export function BookCard({ book }: { book: BookCardData }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <BookShape>
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-800 to-amber-950 text-amber-100">
            <Cross className="h-10 w-10" strokeWidth={1.5} />
          </div>
        )}
      </BookShape>

      <p className="line-clamp-2 w-full max-w-40 text-sm font-medium text-amber-950">
        {book.title}
      </p>

      {book.author && (
        <p className="line-clamp-1 w-full max-w-40 text-xs text-amber-700">
          {book.author}
        </p>
      )}
    </div>
  );
}

export function BookCardPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex aspect-[5/6] w-full max-w-40 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-amber-900/20 bg-amber-50/40 text-amber-400">
        <BookOpen className="h-8 w-8" />
      </div>

      <p className="text-sm text-amber-400">준비중</p>
    </div>
  );
}
