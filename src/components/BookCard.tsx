import { BookOpen } from 'lucide-react';

export interface BookCardData {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
}

export function BookCard({ book }: { book: BookCardData }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative h-40 w-28 overflow-hidden rounded-md border border-amber-900/10 bg-amber-50 shadow-sm">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-amber-100 to-amber-200 text-amber-700">
            <BookOpen className="h-8 w-8" />
            <span className="text-xs">표지 준비중</span>
          </div>
        )}
      </div>
      <p className="line-clamp-2 w-28 text-sm font-medium text-amber-950">
        {book.title}
      </p>
      {book.author && (
        <p className="line-clamp-1 w-28 text-xs text-amber-700">
          {book.author}
        </p>
      )}
    </div>
  );
}

export function BookCardPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-40 w-28 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-amber-900/20 bg-amber-50/40 text-amber-400">
        <BookOpen className="h-8 w-8" />
      </div>
      <p className="text-sm text-amber-400">준비중</p>
    </div>
  );
}
