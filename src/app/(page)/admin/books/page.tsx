'use client';

import { useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Search, SquarePen, Trash2, X } from 'lucide-react';
import Link from 'next/link';

import Modal from '@/components/Modal';
import PhotoCapture from '@/components/PhotoCapture';
import { generateAuthorCode } from '@/lib/authorCode';
import { isValidIsbn13 } from '@/lib/isbn';
import { isValidRegNo, normalizeRegNoInput } from '@/lib/regNo';
import { supabase } from '@/utils/supabase/client';

const STATUS_STYLE: Record<string, string> = {
  대여가능: 'bg-green-100 text-green-800',
  대여중: 'bg-yellow-100 text-yellow-800',
  분실: 'bg-gray-200 text-gray-700',
  폐기: 'bg-gray-200 text-gray-700',
};

const STATUS_OPTIONS = ['대여가능', '대여중', '분실', '폐기'];
const PAGE_SIZE = 50;

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
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  coverUrl: string | null;
  page: string | null;
  price: string | null;
  pubDate: string | null;
  authorCode: string | null;
  isRecommended: boolean;
  categoryCode: string | null;
  categoryMain: string | null;
  categoryLabel: string | null;
}

function EditBookForm({
  book,
  categories,
  onSaved,
  onDelete,
  isDeleting,
}: {
  book: BookRow;
  categories: BookCategory[];
  onSaved: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [title, setTitle] = useState(book.title);
  const [isbn, setIsbn] = useState(book.isbn ?? '');
  const [author, setAuthor] = useState(book.author ?? '');
  const [publisher, setPublisher] = useState(book.publisher ?? '');
  const [coverUrl, setCoverUrl] = useState(book.coverUrl ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isCoverCameraOpen, setIsCoverCameraOpen] = useState(false);
  const [page, setPage] = useState(book.page ?? '');
  const [price, setPrice] = useState(book.price ?? '');
  const [pubDate, setPubDate] = useState(book.pubDate ?? '');
  const [authorCode, setAuthorCode] = useState(book.authorCode ?? '');
  const [categoryMain, setCategoryMain] = useState(book.categoryMain ?? '');
  const [category, setCategory] = useState(book.categoryCode ?? '');
  const [donorName, setDonorName] = useState(book.donorName ?? '');
  const [regNo, setRegNo] = useState(book.regNo);
  const [status, setStatus] = useState(book.status);
  const [isRecommended, setIsRecommended] = useState(book.isRecommended);
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
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        const formData = new FormData();
        formData.append('file', coverFile);
        const coverRes = await fetch('/api/admin/books/cover', {
          method: 'POST',
          body: formData,
        });
        const coverBody = await coverRes.json();
        if (!coverRes.ok) {
          throw new Error(coverBody.error ?? '표지 업로드에 실패했습니다.');
        }
        finalCoverUrl = coverBody.url;
      }

      const res = await fetch(`/api/admin/books/${book.copyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          isbn,
          author,
          publisher,
          coverUrl: finalCoverUrl,
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
          isRecommended,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '수정에 실패했습니다.');
    },
    onSuccess: onSaved,
  });

  const applyCoverFile = (file: File) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverUrl('');
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyCoverFile(file);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setFormError('제목은 필수입니다.');
      return;
    }
    if (isbn.trim() && !isValidIsbn13(isbn.trim())) {
      setFormError('ISBN 형식이 올바르지 않습니다.');
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            ISBN
          </label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 font-mono text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            상태
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-2 text-base font-medium text-amber-950">
            <input
              type="checkbox"
              checked={isRecommended}
              onChange={(e) => setIsRecommended(e.target.checked)}
              className="h-4 w-4 rounded border-amber-900/30 text-red-900 focus:ring-2 focus:ring-amber-900/30"
            />
            추천 도서
          </label>
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
              className="shrink-0 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-950 transition hover:bg-amber-50">
              자동생성
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            분류코드
          </label>
          <div className="flex gap-2">
            <select
              value={categoryMain}
              onChange={(e) => {
                setCategoryMain(e.target.value);
                setCategory('');
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
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
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
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
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            표지 이미지
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {coverPreview || coverUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverPreview || coverUrl.trim()}
                  alt=""
                  className="h-14 w-10 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div className="h-14 w-10 shrink-0 rounded-sm bg-amber-100" />
              )}
              <input
                type="text"
                value={coverUrl}
                onChange={(e) => {
                  setCoverUrl(e.target.value);
                  if (coverFile) {
                    if (coverPreview) URL.revokeObjectURL(coverPreview);
                    setCoverFile(null);
                    setCoverPreview('');
                  }
                }}
                placeholder="URL을 붙여넣거나 아래에서 파일을 선택해주세요"
                className="w-full min-w-0 rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base whitespace-nowrap text-amber-950 transition hover:bg-amber-50">
                파일 선택
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileChange}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setIsCoverCameraOpen(true)}
                className="rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base whitespace-nowrap text-amber-950 transition hover:bg-amber-50">
                사진으로 촬영
              </button>
            </div>
          </div>
          {coverFile && (
            <p className="mt-1.5 text-sm text-amber-800">
              선택된 파일: {coverFile.name} (저장할 때 업로드됩니다)
            </p>
          )}
          {isCoverCameraOpen && (
            <div className="mt-3">
              <PhotoCapture
                title="표지 사진 촬영"
                onCapture={(file) => {
                  applyCoverFile(file);
                  setIsCoverCameraOpen(false);
                }}
                onClose={() => setIsCoverCameraOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {(formError || saveError) && (
        <p className="text-sm text-red-600">
          {formError ?? saveError?.message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={isDeleting}
          onClick={onDelete}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-red-800/30 py-3 text-base font-medium text-red-800 transition hover:bg-red-50 disabled:opacity-50 sm:w-auto sm:px-6">
          <Trash2 className="h-4 w-4" />
          {isDeleting ? '삭제 중...' : '도서 삭제'}
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto sm:px-8">
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

export default function AdminBooksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'recommended'>('all');
  const [searchText, setSearchText] = useState('');
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    // 세로 휠 스크롤을 가로 스크롤로 변환 (PC에서 Shift 없이도 옆으로 넘어가게)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['admin-books'],
    queryFn: async () => {
      const res = await fetch('/api/admin/books');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '목록 조회에 실패했습니다.');
      return body.books as BookRow[];
    },
  });

  const {
    mutate: deleteBook,
    isPending: isDeleting,
    error: deleteError,
    variables: deletingCopyId,
  } = useMutation({
    mutationFn: async (copyId: number) => {
      const res = await fetch(`/api/admin/books/${copyId}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '삭제에 실패했습니다.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-books'] });
    },
  });

  const handleDelete = (book: BookRow, onDeleted?: () => void) => {
    if (
      window.confirm(
        `"${book.title}" (${book.regNo})을(를) 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      deleteBook(book.copyId, { onSuccess: onDeleted });
    }
  };

  const {
    mutate: unrecommendBook,
    isPending: isUnrecommending,
    variables: unrecommendingCopyId,
  } = useMutation({
    mutationFn: async (book: BookRow) => {
      const res = await fetch(`/api/admin/books/${book.copyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          isbn: book.isbn ?? '',
          author: book.author ?? '',
          publisher: book.publisher ?? '',
          coverUrl: book.coverUrl ?? '',
          page: book.page ?? '',
          price: book.price ?? '',
          pubDate: book.pubDate ?? '',
          authorCode: book.authorCode ?? '',
          category: book.categoryCode ?? '',
          donorName: book.donorName ?? '',
          donorUserId: book.donorUserId,
          regNo: book.regNo,
          status: book.status,
          isRecommended: false,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '해제에 실패했습니다.');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-books'] });
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

  const totalPages = Math.max(1, Math.ceil(visibleBooks.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedBooks = visibleBooks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-base text-red-700">
          {deleteError.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-amber-950">도서 목록 관리</h2>

        {activeTab === 'all' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-950" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="제목 또는 저자 검색"
                className="w-64 rounded border border-amber-900/30 bg-white/40 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
              />
            </div>
            <Link
              href="/admin/books/new"
              className="flex items-center gap-1.5 rounded bg-red-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
              <Plus className="h-4 w-4" />
              도서 등록
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-amber-900/20">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`border-b-2 px-4 py-3 text-base transition ${
            activeTab === 'all'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-800 hover:text-amber-950'
          }`}>
          전체 도서
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recommended')}
          className={`border-b-2 px-4 py-3 text-base transition ${
            activeTab === 'recommended'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-800 hover:text-amber-950'
          }`}>
          추천 도서
        </button>
      </div>

      {activeTab === 'recommended' && (
        <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
          <table className="w-full text-left text-base">
            <thead className="border-b border-amber-900/20 text-amber-800">
              <tr>
                <th className="px-5 py-3 font-medium">표지</th>
                <th className="px-5 py-3 font-medium">제목</th>
                <th className="px-5 py-3 font-medium">저자</th>
                <th className="px-5 py-3 font-medium">출판사</th>
                <th className="px-5 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-amber-900/50">
                    불러오는 중...
                  </td>
                </tr>
              ) : books.filter((b) => b.isRecommended).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-amber-900/50">
                    추천 도서가 없습니다. &quot;전체 도서&quot; 탭에서 책을
                    수정해 추천으로 표시해주세요.
                  </td>
                </tr>
              ) : (
                books
                  .filter((b) => b.isRecommended)
                  .map((book) => (
                    <tr key={book.copyId}>
                      <td className="px-5 py-3">
                        {book.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.coverUrl}
                            alt=""
                            className="h-14 w-10 rounded-sm object-cover"
                          />
                        ) : (
                          <div className="h-14 w-10 rounded-sm bg-amber-100" />
                        )}
                      </td>
                      <td className="px-5 py-3 text-amber-950">{book.title}</td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.author ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.publisher ?? '-'}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          disabled={
                            isUnrecommending &&
                            unrecommendingCopyId?.copyId === book.copyId
                          }
                          onClick={() => unrecommendBook(book)}
                          className="rounded border border-amber-900/30 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-50">
                          해제
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'all' && pagedBooks.length > 0 && (
        <p className="text-sm text-amber-800">
          → 표를 옆으로 스크롤하면 나머지 항목을 볼 수 있어요.
        </p>
      )}
      {activeTab === 'all' && (
        <>
          <div
            ref={scrollRef}
            onWheel={handleWheel}
            className="scrollbar-visible max-w-full overflow-x-scroll rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
            <table className="w-full min-w-max text-left text-base whitespace-nowrap">
              <thead className="border-b border-amber-900/20 text-amber-800">
                <tr>
                  <th className="px-5 py-3 font-medium">표지</th>
                  <th className="px-5 py-3 font-medium">등록번호</th>
                  <th className="px-5 py-3 font-medium">제목</th>
                  <th className="px-5 py-3 font-medium">저자</th>
                  <th className="px-5 py-3 font-medium">출판사</th>
                  <th className="px-5 py-3 font-medium">ISBN</th>
                  <th className="px-5 py-3 font-medium">출판일</th>
                  <th className="px-5 py-3 font-medium">페이지</th>
                  <th className="px-5 py-3 font-medium">정가</th>
                  <th className="px-5 py-3 font-medium">저자기호</th>
                  <th className="px-5 py-3 font-medium">기증자명</th>
                  <th className="px-5 py-3 font-medium">카테고리</th>
                  <th className="px-5 py-3 font-medium">상태</th>
                  <th className="px-5 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/10">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-5 py-8 text-center text-amber-900/50">
                      불러오는 중...
                    </td>
                  </tr>
                ) : pagedBooks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-5 py-8 text-center text-amber-900/50">
                      등록된 도서가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagedBooks.map((book) => (
                    <tr key={book.copyId}>
                      <td className="px-5 py-3">
                        {book.coverUrl ? (
                          <span
                            title="표지 있음"
                            className="inline-flex items-center justify-center rounded-full bg-green-100 p-1 text-green-700">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : (
                          <span
                            title="표지 없음"
                            className="inline-flex items-center justify-center rounded-full bg-gray-100 p-1 text-gray-400">
                            <X className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-sm text-amber-800">
                        {book.regNo}
                      </td>
                      <td className="px-5 py-3 text-amber-950">{book.title}</td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.author ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.publisher ?? '-'}
                      </td>
                      <td className="px-5 py-3 font-mono text-sm text-amber-800">
                        {book.isbn ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.pubDate ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.page ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.price ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.authorCode ?? '-'}
                      </td>
                      <td className="px-5 py-3 text-amber-800">
                        {book.donorName ?? '-'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-amber-800 underline decoration-amber-400 underline-offset-2">
                          {book.categoryCode ?? '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-2 py-1 text-sm font-medium ${STATUS_STYLE[book.status]}`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            aria-label="수정"
                            onClick={() => setEditingBook(book)}
                            className="text-amber-600 hover:text-amber-950">
                            <SquarePen className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="삭제"
                            disabled={
                              isDeleting && deletingCopyId === book.copyId
                            }
                            onClick={() => handleDelete(book)}
                            className="text-amber-600 hover:text-red-800 disabled:opacity-40">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
                className="rounded border border-amber-900/30 bg-white/40 px-4 py-2 text-base text-amber-950 transition hover:bg-amber-50 disabled:opacity-40">
                이전
              </button>
              <span className="text-base text-amber-800">
                {safePage} / {totalPages}페이지
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                className="rounded border border-amber-900/30 bg-white/40 px-4 py-2 text-base text-amber-950 transition hover:bg-amber-50 disabled:opacity-40">
                다음
              </button>
            </div>
          )}
        </>
      )}

      {editingBook && (
        <Modal title="도서 정보 수정" onClose={() => setEditingBook(null)}>
          <EditBookForm
            book={editingBook}
            categories={categories}
            onSaved={() => {
              setEditingBook(null);
              void queryClient.invalidateQueries({ queryKey: ['admin-books'] });
            }}
            onDelete={() =>
              handleDelete(editingBook, () => setEditingBook(null))
            }
            isDeleting={isDeleting && deletingCopyId === editingBook.copyId}
          />
        </Modal>
      )}
    </div>
  );
}
