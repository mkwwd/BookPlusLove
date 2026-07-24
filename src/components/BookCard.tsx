import type { ReactNode } from 'react';

import { BookOpen, Cross } from 'lucide-react';

export interface BookCardData {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
}

function BookShape({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-48 w-40 shrink-0">
      <div className="absolute inset-y-1 right-0 w-2 rounded-r-md bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50" />
      <div className="absolute inset-y-0 right-2 left-0 overflow-hidden rounded-md shadow-[3px_6px_10px_rgba(0,0,0,0.18)] ring-1 ring-black/10">
        {children}
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
      <p className="line-clamp-2 w-40 text-sm font-medium text-amber-950">
        {book.title}
      </p>
      {book.author && (
        <p className="line-clamp-1 w-40 text-xs text-amber-700">
          {book.author}
        </p>
      )}
    </div>
  );
}

export function BookCardPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-48 w-40 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-amber-900/20 bg-amber-50/40 text-amber-400">
        <BookOpen className="h-8 w-8" />
      </div>
      <p className="text-sm text-amber-400">준비중</p>
    </div>
  );
}
