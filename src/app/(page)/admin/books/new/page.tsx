'use client';

import { Suspense, useRef, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  PencilLine,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { generateAuthorCode } from '@/lib/authorCode';
import { isValidRegNo, normalizeRegNoInput } from '@/lib/regNo';
import { supabase } from '@/utils/supabase/client';

import ManualBookEntryForm, {
  type BookCategory,
  type ScannedBook,
} from './ManualBookEntryForm';

type Method = 'manual' | 'excel';

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

  return (
    <div>
      {books.length > 0 && (
        <p className="mb-1.5 text-sm text-amber-700">
          → 표를 옆으로 스크롤하면 삭제 버튼 등 나머지 항목을 볼 수 있어요.
        </p>
      )}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="scrollbar-visible max-w-full overflow-x-scroll rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
        <table className="w-full min-w-max text-left text-base whitespace-nowrap">
          <thead className="border-b border-amber-900/20 text-amber-700">
            <tr>
              <th className="px-5 py-3 font-medium">표지</th>
              <th className="px-5 py-3 font-medium">제목</th>
              <th className="px-5 py-3 font-medium">저자</th>
              <th className="px-5 py-3 font-medium">출판사</th>
              <th className="px-5 py-3 font-medium">출판일</th>
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
                  colSpan={13}
                  className="px-5 py-8 text-center text-amber-900/50">
                  {emptyText}
                </td>
              </tr>
            ) : (
              books.map((book) => {
                const trimmedRegNo = book.regNo.trim();
                const isRegNoInvalid =
                  trimmedRegNo === '' || !isValidRegNo(trimmedRegNo);
                const isRegNoDuplicate =
                  trimmedRegNo !== '' &&
                  books.filter((b) => b.regNo.trim() === trimmedRegNo).length >
                    1;

                return (
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
                    <td className="px-5 py-3 text-amber-700">
                      {book.publisher}
                    </td>
                    <td className="px-5 py-3 text-amber-700">
                      {book.pubDate ?? '-'}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-amber-700">
                      {book.isbn || '-'}
                    </td>
                    <td className="px-5 py-3 text-amber-700">
                      {book.page ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-amber-700">
                      {book.price ?? '-'}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={book.regNo}
                        onChange={(e) => {
                          // 한글 조합(IME) 도중에는 값을 건드리지 않는다 —
                          // 조합 중에 값을 바꾸면 조합 중이던 문자가
                          // 중복 커밋되는 문제가 있다. 조합이 끝난 뒤
                          // onCompositionEnd에서만 보정한다.
                          if ((e.nativeEvent as InputEvent).isComposing) {
                            onRegNoChange(book.id, e.target.value);
                            return;
                          }
                          onRegNoChange(
                            book.id,
                            normalizeRegNoInput(e.target.value),
                          );
                        }}
                        onCompositionEnd={(e) =>
                          onRegNoChange(
                            book.id,
                            normalizeRegNoInput(e.currentTarget.value),
                          )
                        }
                        placeholder="예: MB123456"
                        className={`w-32 rounded border bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:outline-none ${
                          isRegNoInvalid || isRegNoDuplicate
                            ? 'border-gray-500 focus:ring-gray-400'
                            : 'border-amber-900/20 focus:ring-amber-900/30'
                        }`}
                      />
                      {isRegNoDuplicate ? (
                        <p className="mt-1 text-xs text-gray-900">
                          중복된 번호
                        </p>
                      ) : (
                        isRegNoInvalid && (
                          <p className="mt-1 text-xs text-gray-900">
                            필수, MB+숫자 6자리
                          </p>
                        )
                      )}
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
                              {code} {label}
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
                                {c.code} {c.label}
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
                        onChange={(e) =>
                          onDonorNameChange(book.id, e.target.value)
                        }
                        placeholder="선택"
                        className="w-20 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        aria-label="목록에서 삭제"
                        onClick={() => onRemove(book.id)}
                        className="text-amber-600 hover:text-gray-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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

  const [fileName, setFileName] = useState<string | null>(null);

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
  };

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

  const [submitResult, setSubmitResult] = useState<{
    registered: number;
    failed: { title: string; regNo: string; error: string }[];
    coverWarnings: string[];
  } | null>(null);

  const {
    mutate: submitEntries,
    isPending: isSubmitting,
    error: submitError,
  } = useMutation({
    mutationFn: async (books: ScannedBook[]) => {
      // 표지 파일을 골라둔 항목은 여기, 실제 등록 시점에만 업로드한다.
      const prepared: ScannedBook[] = [];
      const coverWarnings: string[] = [];

      for (const book of books) {
        if (!book.coverFile) {
          prepared.push(book);
          continue;
        }
        try {
          const formData = new FormData();
          formData.append('file', book.coverFile);
          const coverRes = await fetch('/api/admin/books/cover', {
            method: 'POST',
            body: formData,
          });
          const coverBody = await coverRes.json();
          if (!coverRes.ok) {
            throw new Error(coverBody.error ?? '표지 업로드에 실패했습니다.');
          }
          if (book.coverUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(book.coverUrl);
          }
          prepared.push({
            ...book,
            coverUrl: coverBody.url,
            coverFile: undefined,
          });
        } catch {
          coverWarnings.push(
            `"${book.title}" 표지 업로드에 실패해 표지 없이 등록을 시도합니다.`,
          );
          prepared.push({ ...book, coverUrl: undefined, coverFile: undefined });
        }
      }

      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: prepared }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? '등록에 실패했습니다.');
      }
      return {
        registered: body.registered as number,
        failed: body.failed as {
          title: string;
          regNo: string;
          error: string;
        }[],
        coverWarnings,
        prepared,
      };
    },
    onSuccess: ({ registered, failed, coverWarnings, prepared }) => {
      if (failed.length === 0) {
        setEntries([]);
        setFileName(null);
      } else {
        // 실패한 항목만 남겨서 고치고 다시 등록할 수 있게 한다. 표지가 이미
        // 실제로 업로드된 경우 그 URL을 유지해서 재시도할 때 다시 안 올린다.
        const failedRegNos = new Set(failed.map((f) => f.regNo));
        setEntries(prepared.filter((b) => failedRegNos.has(b.regNo.trim())));
      }
      setJustSubmitted(true);
      setSubmitResult({ registered, failed, coverWarnings });
    },
  });

  const handleSubmit = () => {
    setJustSubmitted(false);
    setSubmitResult(null);
    submitEntries(entries);
  };

  const hasInvalidRegNo = entries.some((book) => {
    const trimmed = book.regNo.trim();
    if (!trimmed) return true;
    const isDuplicate =
      entries.filter((b) => b.regNo.trim() === trimmed).length > 1;
    return !isValidRegNo(trimmed) || isDuplicate;
  });

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
              ? 'border-gray-900 text-gray-900'
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
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-amber-700 hover:text-amber-900'
          }`}>
          <FileSpreadsheet className="h-4 w-4" />
          엑셀 업로드
        </button>
      </div>

      {justSubmitted && submitResult && (
        <div className="space-y-2">
          {submitResult.registered > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-5 py-3 text-base text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              {submitResult.registered}권이 등록되었습니다.
            </div>
          )}
          {submitResult.failed.length > 0 && (
            <div className="rounded-lg border border-gray-300 bg-gray-50 px-5 py-3 text-base text-gray-800">
              <p>{submitResult.failed.length}권은 등록에 실패했습니다:</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {submitResult.failed.map((f) => (
                  <li key={f.regNo}>
                    {f.title} ({f.regNo}) — {f.error}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-sm">
                실패한 항목은 아래 목록에 남겨뒀어요. 고친 뒤 다시 등록해주세요.
              </p>
            </div>
          )}
          {submitResult.coverWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 text-base text-amber-800">
              {submitResult.coverWarnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-5 py-3 text-base text-gray-800">
          {submitError.message}
        </div>
      )}

      {method === 'manual' && (
        <ManualBookEntryForm
          categories={categories}
          existingRegNos={entries.map((e) => e.regNo)}
          onSubmit={(book) => setEntries((prev) => [...prev, book])}
          onReset={() => setJustSubmitted(false)}
        />
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
        onRemove={(id) =>
          setEntries((prev) => {
            const removed = prev.find((b) => b.id === id);
            if (removed?.coverUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(removed.coverUrl);
            }
            return prev.filter((b) => b.id !== id);
          })
        }
        onCategoryMainChange={(id, mainCode) =>
          updateEntry(id, { categoryMain: mainCode, category: '' })
        }
        onCategoryChange={(id, category) => updateEntry(id, { category })}
        onAuthorCodeChange={(id, authorCode) => updateEntry(id, { authorCode })}
        onDonorNameChange={(id, donorName) =>
          updateEntry(id, { donorName, donorUserId: null })
        }
        onRegNoChange={(id, regNo) => updateEntry(id, { regNo })}
        emptyText="등록할 도서가 없습니다. 위에서 조회/직접 입력 또는 엑셀 업로드로 추가해주세요."
      />

      {hasInvalidRegNo && (
        <p className="text-sm text-gray-900">
          등록번호 형식이 잘못되었거나 중복된 항목이 있습니다. 표에서 빨간색으로
          표시된 등록번호를 확인해주세요.
        </p>
      )}

      <button
        type="button"
        disabled={entries.length === 0 || hasInvalidRegNo || isSubmitting}
        onClick={handleSubmit}
        className="w-full rounded bg-gray-900 py-3 text-lg font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 sm:w-auto sm:px-8">
        {isSubmitting
          ? '등록 중...'
          : entries.length > 0
            ? `${entries.length}권 등록하기`
            : '등록하기'}
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
