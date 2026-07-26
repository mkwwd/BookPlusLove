import Image from 'next/image';

import {
  BookCard,
  BookCardPlaceholder,
  type BookCardData,
} from '@/components/BookCard';
import HeroSectionContent from '@/components/HeroSectionContent';
import RevealSection from '@/components/RevealSection';
import { supabaseServer } from '@/utils/supabase/server';

const SECTION_SIZE = 6;

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

export function HeroBackground() {
  return (
    <div className="fixed inset-0 -z-10 flex flex-col">
      <div className="relative h-[100%] w-full">
        <Image
          src="/image/book6.png" // 모바일 이미지 경로
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center md:hidden"
        />

        <Image
          src="/image/book5.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-center md:block"
        />
      </div>

      {/* <div className="h-[calc(1/15*100%)] w-full bg-white" /> */}
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
    <div className="rounded-lg border border-amber-900/10 bg-[#fffdfa]/70 p-6 shadow-xl backdrop-blur-md transition-all">
      <h2 className="mt-5 mb-10 text-center font-serif text-4xl font-bold text-amber-950">
        ✞ {title}
      </h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
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
        <HeroSectionContent
          firstPart="깊이 있는 독서 "
          secondPart="믿음의 시작이 되는 공간"
          subText="◈ 찾고 싶은 도서를 빠르게 검색해보세요 ◈"
          placeholder="책 제목이나 저자를 입력해주세요"
        />
      </section>

      <section className="mx-auto max-w-screen-2xl px-4 py-15 pb-12 sm:px-8 lg:px-12">
        <RevealSection>
          <div className="grid gap-8 md:grid-cols-2">
            <BookSection title="추천 도서" books={recommended} />
            <BookSection title="신규 도서" books={newBooks} />
          </div>
        </RevealSection>
      </section>
    </div>
  );
}
