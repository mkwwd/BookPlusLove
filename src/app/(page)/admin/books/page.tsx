'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, SquarePen } from 'lucide-react';
import Link from 'next/link';

import Modal from '@/components/Modal';
import { generateAuthorCode } from '@/lib/authorCode';
import { isValidRegNo, normalizeRegNoInput } from '@/lib/regNo';
import { supabase } from '@/utils/supabase/client';

const STATUS_STYLE: Record<string, string> = {
  대여가능: 'bg-green-100 text-green-800',
  대여중: 'bg-rose-100 text-rose-700',
  분실: 'bg-gray-200 text-gray-700',
  폐기: 'bg-gray-200 text-gray-700',
};

const STATUS_OPTIONS = ['대여가능', '대여중', '분실', '폐기'];

interface BookCategory {
  code: string;
  label: string;
  main_code: string;
  main_label: string;
}

interface BookRow {
  copyId: number;
  bookId: number;
  regNo: string;
  status: string;
  donorName: string | null;
  donorUserId: number | null;
  title: string;
  author: string | null;
  publisher: string | null;
  page: string | null;
  price: string | null;
  pubDate: string | null;
  authorCode: string | null;
  categoryCode: string | null;
  categoryMain: string | null;
  categoryLabel: string | null;
}

function EditBookForm({
  book,
  categories,
  onSaved,
}: {
  book: BookRow;
  categories: BookCategory[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  const [publisher, setPublisher] = useState(book.publisher ?? '');
  const [page, setPage] = useState(book.page ?? '');
  const [price, setPrice] = useState(book.price ?? '');
  const [pubDate, setPubDate] = useState(book.pubDate ?? '');
  const [authorCode, setAuthorCode] = useState(book.authorCode ?? '');
  const [categoryMain, setCategoryMain] = useState(book.categoryMain ?? '');
  const [category, setCategory] = useState(book.categoryCode ?? '');
  const [donorName, setDonorName] = useState(book.donorName ?? '');
  const [regNo, setRegNo] = useState(book.regNo);
  const [status, setStatus] = useState(book.status);
  const [formError, setFormError] = useState<string | null>(null);

  const mainOptions = Array.from(
    new Map(categories.map((c) => [c.main_code, c.main_label])).entries(),
  );

  const {
    mutate: save,
    isPending: isSaving,
    error: saveError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/books/${book.copyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author,
          publisher,
          page,
          price,
          pubDate,
          authorCode,
          category,
          donorName,
          donorUserId:
            donorName.trim() === book.donorName ? book.donorUserId : null,
          regNo,
          status,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '수정에 실패했습니다.');
    },
    onSuccess: onSaved,
  });

  const handleSave = () => {
    if (!title.trim()) {
      setFormError('제목은 필수입니다.');
      return;
    }
    if (!isValidRegNo(regNo.trim())) {
      setFormError('등록번호는 MB+숫자 6자리 형식이어야 합니다.');
      return;
    }
    setFormError(null);
    save();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            제목 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            저자
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            출판사
          </label>
          <input
            type="text"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            출판일
          </label>
          <input
            type="text"
            value={pubDate}
            onChange={(e) => setPubDate(e.target.value)}
            placeholder="예: 2017년 3월 31일"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            페이지
          </label>
          <input
            type="text"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            정가
          </label>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            등록번호 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={regNo}
            onChange={(e) => {
              if ((e.nativeEvent as InputEvent).isComposing) {
                setRegNo(e.target.value);
                return;
              }
              setRegNo(normalizeRegNoInput(e.target.value));
            }}
            onCompositionEnd={(e) =>
              setRegNo(normalizeRegNoInput(e.currentTarget.value))
            }
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            상태
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            저자기호
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={authorCode}
              onChange={(e) => setAuthorCode(e.target.value)}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setAuthorCode(
                  generateAuthorCode(author.trim(), title.trim()) ?? '',
                )
              }
              className="shrink-0 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-900 transition hover:bg-amber-50">
              자동생성
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            기증자명
          </label>
          <input
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-900">
            분류코드
          </label>
          <div className="flex gap-2">
            <select
              value={categoryMain}
              onChange={(e) => {
                setCategoryMain(e.target.value);
                setCategory('');
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <option value="">대분류</option>
              {mainOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {code} {label}
                </option>
              ))}
            </select>
            <select
              value={category}
              disabled={!categoryMain}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
              <option value="">세부분류</option>
              {categories
                .filter((c) => c.main_code === categoryMain)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} {c.label}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {(formError || saveError) && (
        <p className="text-sm text-red-600">
          {formError ?? saveError?.message}
        </p>
      )}

      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto sm:px-8">
        {isSaving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

export default function AdminBooksPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['admin-books'],
    queryFn: async () => {
      const res = await fetch('/api/admin/books');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '목록 조회에 실패했습니다.');
      return body.books as BookRow[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['book-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_categories')
        .select('code, label, main_code, main_label')
        .order('code');
      if (error) throw error;
      return data as BookCategory[];
    },
  });

  const trimmedSearch = searchText.trim();
  const visibleBooks = books.filter(
    (book) =>
      !trimmedSearch ||
      book.title.includes(trimmedSearch) ||
      (book.author ?? '').includes(trimmedSearch),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-amber-900">도서 목록 관리</h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-900" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="제목 또는 저자 검색"
              className="w-64 rounded border border-amber-900/30 bg-white/70 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
            />
          </div>
          <Link
            href="/admin/books/new"
            className="flex items-center gap-1.5 rounded bg-red-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
            <Plus className="h-4 w-4" />
            도서 등록
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-base">
          <thead className="border-b border-amber-900/20 text-amber-700">
            <tr>
              <th className="px-5 py-3 font-medium">제목</th>
              <th className="px-5 py-3 font-medium">저자</th>
              <th className="px-5 py-3 font-medium">카테고리</th>
              <th className="px-5 py-3 font-medium">등록번호</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  불러오는 중...
                </td>
              </tr>
            ) : visibleBooks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  등록된 도서가 없습니다.
                </td>
              </tr>
            ) : (
              visibleBooks.map((book) => (
                <tr key={book.copyId}>
                  <td className="px-5 py-3 text-amber-900">{book.title}</td>
                  <td className="px-5 py-3 text-amber-700">
                    {book.author ?? '-'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-medium text-amber-800 underline decoration-amber-400 underline-offset-2">
                      {book.categoryLabel ?? '-'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-sm text-amber-700">
                    {book.regNo}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded px-2 py-1 text-sm font-medium ${STATUS_STYLE[book.status]}`}>
                      {book.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      aria-label="수정"
                      onClick={() => setEditingBook(book)}
                      className="text-amber-600 hover:text-amber-900">
                      <SquarePen className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingBook && (
        <Modal title="도서 정보 수정" onClose={() => setEditingBook(null)}>
          <EditBookForm
            book={editingBook}
            categories={categories}
            onSaved={() => {
              setEditingBook(null);
              void queryClient.invalidateQueries({ queryKey: ['admin-books'] });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
