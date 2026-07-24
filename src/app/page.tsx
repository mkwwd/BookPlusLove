import { Search } from 'lucide-react';

import {
  BookCard,
  BookCardPlaceholder,
  type BookCardData,
} from '@/components/BookCard';
import { supabaseServer } from '@/utils/supabase/server';

const SECTION_SIZE = 4;

async function getRecommendedBooks(): Promise<BookCardData[]> {
  const { data } = await supabaseServer
    .from('books')
    .select('id, title, author, cover_url')
    .eq('is_recommended', true)
    .order('created_at', { ascending: false })
    .limit(SECTION_SIZE);

  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: b.cover_url,
  }));
}

async function getNewBooks(): Promise<BookCardData[]> {
  const { data } = await supabaseServer
    .from('books')
    .select('id, title, author, cover_url')
    .order('created_at', { ascending: false })
    .limit(SECTION_SIZE);

  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: b.cover_url,
  }));
}

function HeroBackground() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#5a3413" />
          <stop offset="55%" stopColor="#33200f" />
          <stop offset="100%" stopColor="#150c06" />
        </radialGradient>
        <radialGradient id="lampGlow" cx="50%" cy="46%" r="38%">
          <stop offset="0%" stopColor="#f7d9a0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f7d9a0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pageLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e8d3ab" />
          <stop offset="100%" stopColor="#f8ecd6" />
        </linearGradient>
        <linearGradient id="pageRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8ecd6" />
          <stop offset="100%" stopColor="#e8d3ab" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#bgGlow)" />
      <ellipse cx="800" cy="560" rx="620" ry="360" fill="url(#lampGlow)" />

      {/* light particles */}
      <g fill="#f7d9a0" opacity="0.5">
        <circle cx="420" cy="190" r="3" />
        <circle cx="1180" cy="230" r="2.5" />
        <circle cx="300" cy="330" r="2" />
        <circle cx="1300" cy="360" r="3" />
        <circle cx="740" cy="140" r="2" />
        <circle cx="960" cy="170" r="2.5" />
      </g>

      {/* open book, viewed from above */}
      <g transform="translate(800 700)">
        {/* left page */}
        <path
          d="M0,-40 C -230,-95 -430,-60 -560,10 C -430,55 -230,70 0,40 Z"
          fill="url(#pageLeft)"
        />
        {/* right page */}
        <path
          d="M0,-40 C 230,-95 430,-60 560,10 C 430,55 230,70 0,40 Z"
          fill="url(#pageRight)"
        />
        {/* page-edge lines */}
        <g stroke="#c9a86e" strokeWidth="2" opacity="0.55" fill="none">
          <path d="M-30,-30 C -250,-80 -420,-50 -535,12" />
          <path d="M-20,-15 C -220,-55 -390,-32 -510,15" />
          <path d="M30,-30 C 250,-80 420,-50 535,12" />
          <path d="M20,-15 C 220,-55 390,-32 510,15" />
        </g>
        {/* spine */}
        <path
          d="M0,-42 C 4,-10 4,20 0,42"
          stroke="#8a6a3a"
          strokeWidth="4"
          fill="none"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

function BookSection({
  title,
  books,
}: {
  title: string;
  books: BookCardData[];
}) {
  const placeholderCount = Math.max(0, SECTION_SIZE - books.length);

  return (
    <div className="rounded-lg border border-amber-900/10 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
      <h2 className="mb-5 font-serif text-2xl text-amber-950">{title}</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <BookCardPlaceholder key={`placeholder-${i}`} />
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const [recommended, newBooks] = await Promise.all([
    getRecommendedBooks(),
    getNewBooks(),
  ]);

  return (
    <div className="page-bg min-h-screen">
      <section className="relative flex min-h-[560px] items-center justify-center overflow-hidden">
        <HeroBackground />
        <div className="absolute inset-0 bg-black/25" />

        <div className="relative mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="mb-3 font-serif text-2xl text-white sm:text-3xl">
            깊이 있는 독서, 믿음의 시작이 되는 공간
          </p>
          <p className="mb-9 text-base text-amber-100/90 sm:text-lg">
            ◈찾고 싶은 도서를 빠르게 검색해보세요.◈
          </p>

          <form
            action="/books"
            method="get"
            className="relative mx-auto max-w-lg">
            <Search className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-amber-900/50" />
            <input
              type="text"
              name="q"
              placeholder="책 제목이나 저자를 입력해주세요"
              className="w-full rounded-full bg-white/95 py-4 pr-5 pl-12 text-base text-amber-950 shadow-lg placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <BookSection title="추천 도서" books={recommended} />
          <BookSection title="신규 도서" books={newBooks} />
        </div>
      </section>
    </div>
  );
}
