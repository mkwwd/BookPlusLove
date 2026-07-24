import { Search } from 'lucide-react';
import Image from 'next/image';

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
    <div className="fixed inset-0 -z-10 flex flex-col">
      <div className="relative h-3/4 w-full">
        <Image
          src="/image/book4.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[rgba(255,251,235,0.95)]" />
      </div>
      <div className="h-1/4 w-full bg-[rgba(255,251,235,0.98)]" />
    </div>
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
    <div className="min-h-screen">
      <HeroBackground />

      <section className="flex min-h-[560px] items-center justify-center">
        <div className="relative mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="mb-3 font-serif text-2xl text-amber-950 drop-shadow-[0_2px_10px_rgba(255,255,255,0.85)] sm:text-3xl">
            깊이 있는 독서, 믿음의 시작이 되는 공간
          </p>
          <p className="mb-9 text-base text-amber-900 drop-shadow-[0_1px_8px_rgba(255,255,255,0.85)] sm:text-lg">
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

      <section className="mx-auto max-w-screen-2xl px-4 pb-12 sm:px-6 lg:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <BookSection title="추천 도서" books={recommended} />
          <BookSection title="신규 도서" books={newBooks} />
        </div>
      </section>
    </div>
  );
}
