'use client';

import { Suspense, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  FileSpreadsheet,
  PencilLine,
  ScanLine,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { generateAuthorCode } from '@/lib/authorCode';
import { isValidIsbn13 } from '@/lib/isbn';
import { supabase } from '@/utils/supabase/client';

import CameraScanner from './CameraScanner';

type Method = 'manual' | 'excel';

interface ScannedBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl?: string;
  description?: string;
  page?: string;
  price?: string;
  category: string;
  categoryMain: string;
  authorCode: string;
  donorName: string;
  regNo: string;
}

interface BookCategory {
  code: string;
  label: string;
  main_code: string;
  main_label: string;
}

const MOCK_EXCEL_SOURCE: Omit<
  ScannedBook,
  'id' | 'category' | 'categoryMain' | 'authorCode' | 'donorName' | 'regNo'
>[] = [
  {
    isbn: '9791190090018',
    title: '고백록',
    author: '아우구스티노',
    publisher: '분도출판사',
  },
  {
    isbn: '9788934940042',
    title: '사랑의 기술',
    author: '에리히 프롬',
    publisher: '문예출판사',
  },
  {
    isbn: '9788937460081',
    title: '작은 것들의 신',
    author: '아룬다티 로이',
    publisher: '문학동네',
  },
];

async function fetchIsbnLookup(isbn: string): Promise<ScannedBook> {
  const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? '서지정보 조회에 실패했습니다.');
  }
  return body as ScannedBook;
}

function toScannedBook(
  book: Omit<
    ScannedBook,
    'id' | 'category' | 'categoryMain' | 'authorCode' | 'donorName' | 'regNo'
  >,
): ScannedBook {
  return {
    ...book,
    id: crypto.randomUUID(),
    category: '',
    categoryMain: '',
    authorCode: generateAuthorCode(book.author, book.title) ?? '',
    donorName: '',
    regNo: '',
  };
}

function ScannedBookTable({
  books,
  categories,
  onRemove,
  onCategoryMainChange,
  onCategoryChange,
  onAuthorCodeChange,
  onDonorNameChange,
  onRegNoChange,
  emptyText,
}: {
  books: ScannedBook[];
  categories: BookCategory[];
  onRemove: (id: string) => void;
  onCategoryMainChange: (id: string, mainCode: string) => void;
  onCategoryChange: (id: string, category: string) => void;
  onAuthorCodeChange: (id: string, authorCode: string) => void;
  onDonorNameChange: (id: string, donorName: string) => void;
  onRegNoChange: (id: string, regNo: string) => void;
  emptyText: string;
}) {
  const mainOptions = Array.from(
    new Map(categories.map((c) => [c.main_code, c.main_label])).entries(),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
      <table className="w-full min-w-max text-left text-base whitespace-nowrap">
        <thead className="border-b border-amber-900/20 text-amber-700">
          <tr>
            <th className="px-5 py-3 font-medium">표지</th>
            <th className="px-5 py-3 font-medium">제목</th>
            <th className="px-5 py-3 font-medium">저자</th>
            <th className="px-5 py-3 font-medium">출판사</th>
            <th className="px-5 py-3 font-medium">ISBN</th>
            <th className="px-5 py-3 font-medium">페이지</th>
            <th className="px-5 py-3 font-medium">정가</th>
            <th className="px-5 py-3 font-medium">등록번호</th>
            <th className="px-5 py-3 font-medium">분류코드</th>
            <th className="px-5 py-3 font-medium">저자기호</th>
            <th className="px-5 py-3 font-medium">기증자명</th>
            <th className="px-5 py-3 font-medium">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-amber-900/10">
          {books.length === 0 ? (
            <tr>
              <td
                colSpan={12}
                className="px-5 py-8 text-center text-amber-900/50">
                {emptyText}
              </td>
            </tr>
          ) : (
            books.map((book) => (
              <tr key={book.id}>
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
                <td className="px-5 py-3 text-amber-900">{book.title}</td>
                <td className="px-5 py-3 text-amber-700">{book.author}</td>
                <td className="px-5 py-3 text-amber-700">{book.publisher}</td>
                <td className="px-5 py-3 font-mono text-sm text-amber-700">
                  {book.isbn || '-'}
                </td>
                <td className="px-5 py-3 text-amber-700">{book.page ?? '-'}</td>
                <td className="px-5 py-3 text-amber-700">
                  {book.price ?? '-'}
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={book.regNo}
                    onChange={(e) => onRegNoChange(book.id, e.target.value)}
                    placeholder="예: MB0000021622"
                    className="w-32 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <select
                      value={book.categoryMain}
                      onChange={(e) =>
                        onCategoryMainChange(book.id, e.target.value)
                      }
                      className="rounded border border-amber-900/20 bg-white/50 px-1.5 py-1.5 text-sm text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
                      <option value="">대분류</option>
                      {mainOptions.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={book.category}
                      disabled={!book.categoryMain}
                      onChange={(e) =>
                        onCategoryChange(book.id, e.target.value)
                      }
                      className="rounded border border-amber-900/20 bg-white/50 px-1.5 py-1.5 text-sm text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
                      <option value="">세부분류</option>
                      {categories
                        .filter((c) => c.main_code === book.categoryMain)
                        .map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={book.authorCode}
                    onChange={(e) =>
                      onAuthorCodeChange(book.id, e.target.value)
                    }
                    placeholder="예: 게68ㄴ"
                    className="w-20 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={book.donorName}
                    onChange={(e) => onDonorNameChange(book.id, e.target.value)}
                    placeholder="선택"
                    className="w-20 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    aria-label="목록에서 삭제"
                    onClick={() => onRemove(book.id)}
                    className="text-amber-600 hover:text-red-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function BookRegisterContent() {
  const searchParams = useSearchParams();
  const initialMethod: Method =
    searchParams.get('method') === 'excel' ? 'excel' : 'manual';
  const [method, setMethod] = useState<Method>(initialMethod);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // 방법(직접입력/엑셀)과 무관하게 등록 대상 목록은 하나로 공유한다.
  const [entries, setEntries] = useState<ScannedBook[]>([]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualPage, setManualPage] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');
  const [manualDescription, setManualDescription] = useState<
    string | undefined
  >();
  const [manualCategoryMain, setManualCategoryMain] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualRegNo, setManualRegNo] = useState('');
  const [manualDonorName, setManualDonorName] = useState('');
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [manualIsbnError, setManualIsbnError] = useState<string | null>(null);

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

  const manualMainOptions = Array.from(
    new Map(categories.map((c) => [c.main_code, c.main_label])).entries(),
  );

  const switchMethod = (next: Method) => {
    setMethod(next);
    setIsCameraOpen(false);
  };

  const {
    mutate: lookupManualIsbn,
    isPending: isManualLookingUp,
    error: manualLookupError,
  } = useMutation({
    mutationFn: fetchIsbnLookup,
    onSuccess: (book) => {
      setManualTitle(book.title);
      setManualAuthor(book.author);
      setManualPublisher(book.publisher);
      setManualPage(book.page ?? '');
      setManualPrice(book.price ?? '');
      setManualCoverUrl(book.coverUrl ?? '');
      setManualDescription(book.description);
    },
  });

  const updateEntry = (id: string, patch: Partial<ScannedBook>) => {
    setEntries((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // TODO: parse the actual file once bulk upload is wired to Supabase;
    // this is a placeholder preview so the flow can be reviewed as UI.
    setEntries((prev) => [...prev, ...MOCK_EXCEL_SOURCE.map(toScannedBook)]);
    setJustSubmitted(false);
  };

  const handleManualLookup = (scannedIsbn?: string) => {
    const isbn = (scannedIsbn ?? manualIsbn).trim();
    if (!isbn || isManualLookingUp) return;
    if (scannedIsbn) setManualIsbn(scannedIsbn);

    if (!isValidIsbn13(isbn)) {
      setManualIsbnError(`"${isbn}"은(는) ISBN 형식이 아닙니다.`);
      return;
    }
    setManualIsbnError(null);
    lookupManualIsbn(isbn);
  };

  const handleAddManualEntry = () => {
    if (!manualTitle.trim()) {
      setManualFormError('제목은 필수입니다.');
      return;
    }
    setManualFormError(null);
    const title = manualTitle.trim();
    const author = manualAuthor.trim();
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        isbn: manualIsbn.trim(),
        title,
        author,
        publisher: manualPublisher.trim(),
        page: manualPage.trim() || undefined,
        price: manualPrice.trim() || undefined,
        coverUrl: manualCoverUrl.trim() || undefined,
        description: manualDescription,
        category: manualCategory,
        categoryMain: manualCategoryMain,
        authorCode: generateAuthorCode(author, title) ?? '',
        donorName: manualDonorName.trim(),
        regNo: manualRegNo.trim(),
      },
    ]);
    setManualTitle('');
    setManualAuthor('');
    setManualPublisher('');
    setManualIsbn('');
    setManualPage('');
    setManualPrice('');
    setManualCoverUrl('');
    setManualDescription(undefined);
    setManualCategoryMain('');
    setManualCategory('');
    setManualRegNo('');
    setManualDonorName('');
    setManualIsbnError(null);
    setIsCameraOpen(false);
    setJustSubmitted(false);
  };

  const handleSubmit = () => {
    setJustSubmitted(true);
    setEntries([]);
    setFileName(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/books"
          aria-label="목록으로"
          className="text-amber-700 hover:text-amber-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="font-serif text-3xl text-amber-900">도서 등록</h2>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-amber-900/20">
        <button
          type="button"
          onClick={() => switchMethod('manual')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-base transition ${
            method === 'manual'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-700 hover:text-amber-900'
          }`}>
          <PencilLine className="h-4 w-4" />
          도서 등록
        </button>
        <button
          type="button"
          onClick={() => switchMethod('excel')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-base transition ${
            method === 'excel'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-700 hover:text-amber-900'
          }`}>
          <FileSpreadsheet className="h-4 w-4" />
          엑셀 업로드
        </button>
      </div>

      {justSubmitted && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-5 py-3 text-base text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          도서가 등록되었습니다.
        </div>
      )}

      {method === 'manual' && (
        <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <p className="mb-4 text-sm text-amber-700">
            ISBN이 있으면 스캔하거나 입력해서 조회하고, 없는 책은 아래 항목을
            직접 입력해주세요.
          </p>
          <div className="mb-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-base font-medium text-amber-900">
              <Barcode className="h-4 w-4" />
              ISBN (있는 경우)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualIsbn}
                disabled={isManualLookingUp}
                onChange={(e) => {
                  setManualIsbn(e.target.value);
                  setManualIsbnError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualLookup();
                  }
                }}
                placeholder="바코드를 스캔하거나 ISBN을 입력 후 조회, 없으면 비워두세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isManualLookingUp}
                onClick={() => handleManualLookup()}
                className="shrink-0 rounded bg-amber-900/90 px-5 py-2.5 text-base font-medium text-white transition hover:bg-amber-900 disabled:opacity-50">
                {isManualLookingUp ? '조회 중...' : '조회'}
              </button>
            </div>
            <p className="mt-1.5 text-sm text-amber-700">
              조회하면 아래 제목/저자/출판사/페이지/정가가 자동으로 채워집니다.
              채워진 내용은 계속 수정할 수 있어요.
            </p>
            {manualIsbnError && (
              <p className="mt-1.5 text-sm text-red-600">{manualIsbnError}</p>
            )}
            {manualLookupError && (
              <p className="mt-1.5 text-sm text-red-600">
                {manualLookupError.message}
              </p>
            )}

            {!isCameraOpen && (
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="mt-3 flex items-center gap-1.5 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-900 transition hover:bg-amber-50">
                <ScanLine className="h-4 w-4" />
                카메라로 스캔
              </button>
            )}

            {isCameraOpen && (
              <div className="mt-3">
                <CameraScanner
                  onDetected={(isbn) => {
                    handleManualLookup(isbn);
                    setIsCameraOpen(false);
                  }}
                  onClose={() => setIsCameraOpen(false)}
                />
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                제목 <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="도서 제목을 입력해주세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                저자
              </label>
              <input
                type="text"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
                placeholder="저자명을 입력해주세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                출판사
              </label>
              <input
                type="text"
                value={manualPublisher}
                onChange={(e) => setManualPublisher(e.target.value)}
                placeholder="출판사를 입력해주세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                페이지
              </label>
              <input
                type="text"
                value={manualPage}
                onChange={(e) => setManualPage(e.target.value)}
                placeholder="예: 307 p."
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                정가
              </label>
              <input
                type="text"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="예: 15000"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                등록번호
              </label>
              <input
                type="text"
                value={manualRegNo}
                onChange={(e) => setManualRegNo(e.target.value)}
                placeholder="예: MB0000021622"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                기증자명
              </label>
              <input
                type="text"
                value={manualDonorName}
                onChange={(e) => setManualDonorName(e.target.value)}
                placeholder="선택"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                분류코드
              </label>
              <div className="flex gap-2">
                <select
                  value={manualCategoryMain}
                  onChange={(e) => {
                    setManualCategoryMain(e.target.value);
                    setManualCategory('');
                  }}
                  className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
                  <option value="">대분류</option>
                  {manualMainOptions.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={manualCategory}
                  disabled={!manualCategoryMain}
                  onChange={(e) => setManualCategory(e.target.value)}
                  className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
                  <option value="">세부분류</option>
                  {categories
                    .filter((c) => c.main_code === manualCategoryMain)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-base font-medium text-amber-900">
                표지 이미지 URL
              </label>
              <div className="flex items-center gap-3">
                {manualCoverUrl.trim() && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={manualCoverUrl.trim()}
                    alt=""
                    className="h-14 w-10 shrink-0 rounded-sm object-cover"
                  />
                )}
                <input
                  type="text"
                  value={manualCoverUrl}
                  onChange={(e) => setManualCoverUrl(e.target.value)}
                  placeholder="표지 이미지 URL이 있으면 붙여넣어주세요"
                  className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                />
              </div>
            </div>
          </div>
          {manualFormError && (
            <p className="mt-3 text-sm text-red-600">{manualFormError}</p>
          )}
          <button
            type="button"
            onClick={handleAddManualEntry}
            className="mt-4 rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
            목록에 추가
          </button>
        </div>
      )}

      {method === 'excel' && (
        <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <label className="mb-2 block text-base font-medium text-amber-900">
            엑셀 파일
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="block w-full text-base text-amber-900 file:mr-4 file:rounded file:border-0 file:bg-amber-100 file:px-4 file:py-2.5 file:text-base file:font-medium file:text-amber-900 hover:file:bg-amber-200"
          />
          <p className="mt-2 text-sm text-amber-700">
            열 순서: 제목, 저자, 출판사, ISBN, 카테고리, 수량
          </p>
          {fileName && (
            <p className="mt-2 text-sm text-amber-900">
              선택된 파일: {fileName}
            </p>
          )}
        </div>
      )}

      <ScannedBookTable
        books={entries}
        categories={categories}
        onRemove={(id) => setEntries((prev) => prev.filter((b) => b.id !== id))}
        onCategoryMainChange={(id, mainCode) =>
          updateEntry(id, { categoryMain: mainCode, category: '' })
        }
        onCategoryChange={(id, category) => updateEntry(id, { category })}
        onAuthorCodeChange={(id, authorCode) => updateEntry(id, { authorCode })}
        onDonorNameChange={(id, donorName) => updateEntry(id, { donorName })}
        onRegNoChange={(id, regNo) => updateEntry(id, { regNo })}
        emptyText="등록할 도서가 없습니다. 위에서 조회/직접 입력 또는 엑셀 업로드로 추가해주세요."
      />

      <button
        type="button"
        disabled={entries.length === 0}
        onClick={handleSubmit}
        className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto sm:px-8">
        {entries.length > 0 ? `${entries.length}권 등록하기` : '등록하기'}
      </button>
    </div>
  );
}

export default function AdminBookRegisterPage() {
  return (
    <Suspense fallback={null}>
      <BookRegisterContent />
    </Suspense>
  );
}
