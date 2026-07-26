import type { ReactNode } from 'react';

import { BookOpen, Cross } from 'lucide-react';

export interface BookCardData {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
}

const PAGE_THICKNESS = 14;

function BookShape({ children }: { children: ReactNode }) {
  return (
    <div className="aspect-[5/6] w-full max-w-40 shrink-0 [perspective:900px]">
      <div
        className="relative h-full w-full [transform-style:preserve-3d]"
        style={{
          transformOrigin: 'right center',
          transform: 'rotateY(-22deg)',
        }}>
        <div
          className="absolute top-0 right-0 h-full rounded-r-[3px] bg-gradient-to-b [background-image:repeating-linear-gradient(to_bottom,rgba(120,90,50,0.35)_0px,rgba(120,90,50,0.35)_1px,transparent_1px,transparent_3px)] from-amber-50 via-amber-100 to-amber-50"
          style={{
            width: `${PAGE_THICKNESS}px`,
            transformOrigin: 'left center',
            transform: `translateX(${PAGE_THICKNESS}px) rotateY(90deg)`,
          }}
        />
        <div className="absolute inset-0 overflow-hidden rounded-md shadow-xl ring-1 ring-black/10 [backface-visibility:hidden]">
          {children}
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
            <span className="text-xs text-amber-200/80">표지 준비중</span>
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
