'use client';

import { Suspense, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  FileSpreadsheet,
  ScanLine,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { generateAuthorCode } from '@/lib/authorCode';
import { isValidIsbn13 } from '@/lib/isbn';
import { supabase } from '@/utils/supabase/client';

import CameraScanner from './CameraScanner';

type Method = 'barcode' | 'excel';

interface ScannedBook {
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
  'category' | 'categoryMain' | 'authorCode' | 'donorName' | 'regNo'
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

function toScannedBook(
  book: Omit<
    ScannedBook,
    'category' | 'categoryMain' | 'authorCode' | 'donorName' | 'regNo'
  >,
): ScannedBook {
  return {
    ...book,
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
  onRemove: (isbn: string) => void;
  onCategoryMainChange: (isbn: string, mainCode: string) => void;
  onCategoryChange: (isbn: string, category: string) => void;
  onAuthorCodeChange: (isbn: string, authorCode: string) => void;
  onDonorNameChange: (isbn: string, donorName: string) => void;
  onRegNoChange: (isbn: string, regNo: string) => void;
  emptyText: string;
}) {
  const mainOptions = Array.from(
    new Map(categories.map((c) => [c.main_code, c.main_label])).entries(),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
      <table className="w-full text-left text-base">
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
              <tr key={book.isbn}>
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
                  {book.isbn}
                </td>
                <td className="px-5 py-3 text-amber-700">{book.page ?? '-'}</td>
                <td className="px-5 py-3 text-amber-700">
                  {book.price ?? '-'}
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={book.regNo}
                    onChange={(e) => onRegNoChange(book.isbn, e.target.value)}
                    placeholder="예: EM0000021622"
                    className="w-32 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <select
                      value={book.categoryMain}
                      onChange={(e) =>
                        onCategoryMainChange(book.isbn, e.target.value)
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
                        onCategoryChange(book.isbn, e.target.value)
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
                      onAuthorCodeChange(book.isbn, e.target.value)
                    }
                    placeholder="예: 게68ㄴ"
                    className="w-20 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <input
                    type="text"
                    value={book.donorName}
                    onChange={(e) =>
                      onDonorNameChange(book.isbn, e.target.value)
                    }
                    placeholder="선택"
                    className="w-20 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                  />
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    aria-label="목록에서 삭제"
                    onClick={() => onRemove(book.isbn)}
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
    searchParams.get('method') === 'excel' ? 'excel' : 'barcode';
  const [method, setMethod] = useState<Method>(initialMethod);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const [isbnInput, setIsbnInput] = useState('');
  const [isbnValidationError, setIsbnValidationError] = useState<string | null>(
    null,
  );
  const [recognized, setRecognized] = useState<ScannedBook[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [excelRows, setExcelRows] = useState<ScannedBook[]>([]);

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

  const switchMethod = (next: Method) => {
    setMethod(next);
    setJustSubmitted(false);
    setIsCameraOpen(false);
  };

  const {
    mutate: lookupIsbn,
    isPending: isLookingUp,
    error: lookupError,
  } = useMutation({
    mutationFn: async (isbn: string) => {
      const res = await fetch(
        `/api/books/isbn?isbn=${encodeURIComponent(isbn)}`,
      );
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? '서지정보 조회에 실패했습니다.');
      }
      return body as ScannedBook;
    },
    onSuccess: (book) => {
      setRecognized((prev) =>
        prev.some((b) => b.isbn === book.isbn)
          ? prev
          : [...prev, toScannedBook(book)],
      );
      setJustSubmitted(false);
    },
  });

  const updateCategory = (
    setter: React.Dispatch<React.SetStateAction<ScannedBook[]>>,
    isbn: string,
    category: string,
  ) => {
    setter((prev) =>
      prev.map((b) => (b.isbn === isbn ? { ...b, category } : b)),
    );
  };

  const updateCategoryMain = (
    setter: React.Dispatch<React.SetStateAction<ScannedBook[]>>,
    isbn: string,
    categoryMain: string,
  ) => {
    setter((prev) =>
      prev.map((b) =>
        b.isbn === isbn ? { ...b, categoryMain, category: '' } : b,
      ),
    );
  };

  const updateAuthorCode = (
    setter: React.Dispatch<React.SetStateAction<ScannedBook[]>>,
    isbn: string,
    authorCode: string,
  ) => {
    setter((prev) =>
      prev.map((b) => (b.isbn === isbn ? { ...b, authorCode } : b)),
    );
  };

  const updateDonorName = (
    setter: React.Dispatch<React.SetStateAction<ScannedBook[]>>,
    isbn: string,
    donorName: string,
  ) => {
    setter((prev) =>
      prev.map((b) => (b.isbn === isbn ? { ...b, donorName } : b)),
    );
  };

  const updateRegNo = (
    setter: React.Dispatch<React.SetStateAction<ScannedBook[]>>,
    isbn: string,
    regNo: string,
  ) => {
    setter((prev) => prev.map((b) => (b.isbn === isbn ? { ...b, regNo } : b)));
  };

  const handleRecognize = (scannedIsbn?: string) => {
    const isbn = (scannedIsbn ?? isbnInput).trim();
    if (!isbn || isLookingUp) return;
    if (!scannedIsbn) setIsbnInput('');

    if (!isValidIsbn13(isbn)) {
      setIsbnValidationError(
        `"${isbn}"은(는) ISBN 형식이 아닙니다. 책 뒷면의 ISBN 바코드(978 또는 979로 시작)를 스캔해주세요.`,
      );
      return;
    }
    setIsbnValidationError(null);

    if (recognized.some((book) => book.isbn === isbn)) return;
    lookupIsbn(isbn);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // TODO: parse the actual file once bulk upload is wired to Supabase;
    // this is a placeholder preview so the flow can be reviewed as UI.
    setExcelRows(MOCK_EXCEL_SOURCE.map(toScannedBook));
    setJustSubmitted(false);
  };

  const handleSubmit = () => {
    setJustSubmitted(true);
    if (method === 'barcode') {
      setRecognized([]);
    } else {
      setExcelRows([]);
      setFileName(null);
    }
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

      <div className="flex gap-2 border-b border-amber-900/20">
        <button
          type="button"
          onClick={() => switchMethod('barcode')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-base transition ${
            method === 'barcode'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-700 hover:text-amber-900'
          }`}>
          <Barcode className="h-4 w-4" />
          바코드 인식
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

      {method === 'barcode' ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
            <label className="mb-2 block text-base font-medium text-amber-900">
              ISBN 바코드
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={isbnInput}
                disabled={isLookingUp}
                onChange={(e) => {
                  setIsbnInput(e.target.value);
                  setIsbnValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRecognize();
                  }
                }}
                placeholder="바코드를 스캔하거나 ISBN을 직접 입력해주세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isLookingUp}
                onClick={() => handleRecognize()}
                className="shrink-0 rounded bg-red-900 px-5 py-3 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
                {isLookingUp ? '조회 중...' : '인식'}
              </button>
            </div>
            <p className="mt-2 text-sm text-amber-700">
              스캐너를 이 입력창에 포커스한 상태로 바코드를 읽히면 Enter로 자동
              인식됩니다. 국립중앙도서관 서지정보를 실시간으로 조회합니다.
            </p>
            {isbnValidationError && (
              <p className="mt-2 text-sm text-red-600">{isbnValidationError}</p>
            )}
            {lookupError && (
              <p className="mt-2 text-sm text-red-600">{lookupError.message}</p>
            )}

            {!isCameraOpen && (
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="mt-4 flex items-center gap-1.5 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-900 transition hover:bg-amber-50">
                <ScanLine className="h-4 w-4" />
                카메라로 스캔
              </button>
            )}
          </div>

          {isCameraOpen && (
            <CameraScanner
              onDetected={(isbn) => {
                handleRecognize(isbn);
                setIsCameraOpen(false);
              }}
              onClose={() => setIsCameraOpen(false)}
            />
          )}

          <ScannedBookTable
            books={recognized}
            categories={categories}
            onRemove={(isbn) =>
              setRecognized((prev) => prev.filter((b) => b.isbn !== isbn))
            }
            onCategoryMainChange={(isbn, mainCode) =>
              updateCategoryMain(setRecognized, isbn, mainCode)
            }
            onCategoryChange={(isbn, category) =>
              updateCategory(setRecognized, isbn, category)
            }
            onAuthorCodeChange={(isbn, authorCode) =>
              updateAuthorCode(setRecognized, isbn, authorCode)
            }
            onDonorNameChange={(isbn, donorName) =>
              updateDonorName(setRecognized, isbn, donorName)
            }
            onRegNoChange={(isbn, regNo) =>
              updateRegNo(setRecognized, isbn, regNo)
            }
            emptyText="인식된 도서가 없습니다"
          />

          <button
            type="button"
            disabled={recognized.length === 0}
            onClick={handleSubmit}
            className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto sm:px-8">
            {recognized.length > 0
              ? `${recognized.length}권 등록하기`
              : '등록하기'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
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

          <ScannedBookTable
            books={excelRows}
            categories={categories}
            onRemove={(isbn) =>
              setExcelRows((prev) => prev.filter((b) => b.isbn !== isbn))
            }
            onCategoryMainChange={(isbn, mainCode) =>
              updateCategoryMain(setExcelRows, isbn, mainCode)
            }
            onCategoryChange={(isbn, category) =>
              updateCategory(setExcelRows, isbn, category)
            }
            onAuthorCodeChange={(isbn, authorCode) =>
              updateAuthorCode(setExcelRows, isbn, authorCode)
            }
            onDonorNameChange={(isbn, donorName) =>
              updateDonorName(setExcelRows, isbn, donorName)
            }
            onRegNoChange={(isbn, regNo) =>
              updateRegNo(setExcelRows, isbn, regNo)
            }
            emptyText="업로드할 파일을 선택해주세요"
          />

          <button
            type="button"
            disabled={excelRows.length === 0}
            onClick={handleSubmit}
            className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto sm:px-8">
            {excelRows.length > 0
              ? `${excelRows.length}권 업로드하기`
              : '업로드하기'}
          </button>
        </div>
      )}
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
