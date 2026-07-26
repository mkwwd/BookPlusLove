import { Search } from 'lucide-react';

import { BookCard, type BookCardData } from '@/components/BookCard';
import { supabaseServer } from '@/utils/supabase/server';

function sanitizeForOrFilter(value: string) {
  // PostgREST's or() filter treats , . ( ) as syntax; wrapping the value in
  // double quotes lets it contain those safely, so just escape literal
  // double quotes to avoid breaking out of the quoted value.
  return value.replace(/"/g, '\\"');
}

async function searchBooks(query: string): Promise<BookCardData[]> {
  const safeQuery = sanitizeForOrFilter(query);
  const { data } = await supabaseServer
    .from('books')
    .select('id, title, author, cover_url')
    .or(`title.ilike."%${safeQuery}%",author.ilike."%${safeQuery}%"`)
    .order('created_at', { ascending: false })
    .limit(60);

  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    coverUrl: b.cover_url,
  }));
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const trimmedQuery = q?.trim() ?? '';
  const books = trimmedQuery ? await searchBooks(trimmedQuery) : [];

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-6 font-serif text-3xl text-amber-950">도서 검색</h1>

        <form action="/books" method="get" className="relative mb-10 max-w-lg">
          <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-amber-900/50" />
          <input
            type="text"
            name="q"
            defaultValue={trimmedQuery}
            placeholder="책 제목이나 저자를 입력해주세요"
            className="w-full rounded-full border border-amber-900/20 bg-white/70 py-3 pr-5 pl-11 text-base placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </form>

        {!trimmedQuery ? (
          <p className="text-amber-700">검색어를 입력해주세요.</p>
        ) : books.length === 0 ? (
          <p className="text-amber-700">
            &quot;{trimmedQuery}&quot;에 대한 검색 결과가 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
