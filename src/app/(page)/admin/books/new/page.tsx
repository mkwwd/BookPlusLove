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
import * as XLSX from 'xlsx';

import { generateAuthorCode } from '@/lib/authorCode';
import { isValidRegNo, normalizeRegNoInput } from '@/lib/regNo';
import { supabase } from '@/utils/supabase/client';

import ManualBookEntryForm, {
  type BookCategory,
  type ScannedBook,
} from './ManualBookEntryForm';

type Method = 'manual' | 'excel';

// 열 순서(헤더 없음): (미사용), (미사용), 등록번호, 제목, 분류코드, 저자기호,
// 권차, 저자, 출판사, 출판일, 정가, ISBN, 기증자명, (미사용), (미사용)
function excelCell(row: string[], index: number): string {
  return (row[index] ?? '').trim();
}

function normalizeExcelRegNo(raw: string): string {
  const match = raw.match(/(\d+)/);
  if (!match) return '';
  return `MB${match[1].slice(-6).padStart(6, '0')}`;
}

function normalizeExcelPrice(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  return digits;
}

function normalizeExcelPubDate(raw: string): string {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return raw;
  const [, month, day, yy] = match;
  const currentTwoDigitYear = new Date().getFullYear() % 100;
  const yyyy =
    Number(yy) <= currentTwoDigitYear ? 2000 + Number(yy) : 1900 + Number(yy);
  return `${yyyy}년 ${Number(month)}월 ${Number(day)}일`;
}

function rowToScannedBook(
  row: string[],
  categories: BookCategory[],
): ScannedBook {
  const author = excelCell(row, 7);
  const title = excelCell(row, 3);
  const rawCategoryCode = excelCell(row, 4);
  const paddedCategoryCode = /^\d+$/.test(rawCategoryCode)
    ? rawCategoryCode.padStart(3, '0')
    : rawCategoryCode;
  const matchedCategory = categories.find((c) => c.code === paddedCategoryCode);

  return {
    id: crypto.randomUUID(),
    isbn: excelCell(row, 11),
    title,
    author,
    publisher: excelCell(row, 8),
    price: normalizeExcelPrice(excelCell(row, 10)) || undefined,
    pubDate: normalizeExcelPubDate(excelCell(row, 9)) || undefined,
    volume: excelCell(row, 6) || undefined,
    category: matchedCategory?.code ?? '',
    categoryMain: matchedCategory?.main_code ?? '',
    authorCode: excelCell(row, 5) || generateAuthorCode(author, title) || '',
    donorName: excelCell(row, 12),
    regNo: normalizeExcelRegNo(excelCell(row, 2)),
  };
}

function ScannedBookTable({
  books,
  categories,
  onRemove,
  onTitleChange,
  onCategoryMainChange,
  onCategoryChange,
  onAuthorCodeChange,
  onDonorNameChange,
  onRegNoChange,
  onVolumeChange,
  emptyText,
}: {
  books: ScannedBook[];
  categories: BookCategory[];
  onRemove: (id: string) => void;
  onTitleChange: (id: string, title: string) => void;
  onCategoryMainChange: (id: string, mainCode: string) => void;
  onCategoryChange: (id: string, category: string) => void;
  onAuthorCodeChange: (id: string, authorCode: string) => void;
  onDonorNameChange: (id: string, donorName: string) => void;
  onRegNoChange: (id: string, regNo: string) => void;
  onVolumeChange: (id: string, volume: string) => void;
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
        <p className="mb-1.5 text-sm text-amber-800">
          → 표를 옆으로 스크롤하면 삭제 버튼 등 나머지 항목을 볼 수 있어요.
        </p>
      )}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="scrollbar-visible max-w-full overflow-x-scroll rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
        <table className="w-full min-w-max text-left text-base whitespace-nowrap">
          <thead className="border-b border-amber-900/20 text-amber-800">
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
              <th className="px-5 py-3 font-medium">권차</th>
              <th className="px-5 py-3 font-medium">기증자명</th>
              <th className="px-5 py-3 font-medium">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {books.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
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
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={book.title}
                        onChange={(e) => onTitleChange(book.id, e.target.value)}
                        placeholder="제목 입력 필요"
                        className={`w-40 rounded border bg-white/50 px-2 py-1.5 text-sm placeholder:text-red-400 focus:ring-2 focus:outline-none ${
                          book.title.trim() === ''
                            ? 'border-red-400 focus:ring-red-300'
                            : 'border-amber-900/20 focus:ring-amber-900/30'
                        }`}
                      />
                    </td>
                    <td className="px-5 py-3 text-amber-800">{book.author}</td>
                    <td className="px-5 py-3 text-amber-800">
                      {book.publisher}
                    </td>
                    <td className="px-5 py-3 text-amber-800">
                      {book.pubDate ?? '-'}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-amber-800">
                      {book.isbn || '-'}
                    </td>
                    <td className="px-5 py-3 text-amber-800">
                      {book.page ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-amber-800">
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
                            ? 'border-red-400 focus:ring-red-300'
                            : 'border-amber-900/20 focus:ring-amber-900/30'
                        }`}
                      />
                      {isRegNoDuplicate ? (
                        <p className="mt-1 text-xs text-red-600">중복된 번호</p>
                      ) : (
                        isRegNoInvalid && (
                          <p className="mt-1 text-xs text-red-600">
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
                          className="rounded border border-amber-900/20 bg-white/50 px-1.5 py-1.5 text-sm text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
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
                          className="rounded border border-amber-900/20 bg-white/50 px-1.5 py-1.5 text-sm text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
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
                        value={book.volume ?? ''}
                        onChange={(e) =>
                          onVolumeChange(book.id, e.target.value)
                        }
                        placeholder="선택"
                        className="w-16 rounded border border-amber-900/20 bg-white/50 px-2 py-1.5 text-sm placeholder:text-amber-900/40 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
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
                        className="text-amber-600 hover:text-red-800">
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

  const [excelParseError, setExcelParseError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setExcelParseError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
      });

      const parsedBooks = rows
        .filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row) => rowToScannedBook(row, categories));

      setEntries((prev) => [...prev, ...parsedBooks]);
    } catch {
      setExcelParseError(
        '엑셀 파일을 읽는 데 실패했습니다. 파일 형식을 확인해주세요.',
      );
    }
    setJustSubmitted(false);
    e.target.value = '';
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

  const hasEmptyTitle = entries.some((book) => book.title.trim() === '');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/books"
          aria-label="목록으로"
          className="text-amber-800 hover:text-amber-950">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="font-serif text-3xl text-amber-950">도서 등록</h2>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-amber-900/20">
        <button
          type="button"
          onClick={() => switchMethod('manual')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-base transition ${
            method === 'manual'
              ? 'border-red-900 text-red-900'
              : 'border-transparent text-amber-800 hover:text-amber-950'
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
              : 'border-transparent text-amber-800 hover:text-amber-950'
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
            <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-base text-red-700">
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
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-base text-red-700">
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
        <div className="rounded-lg border border-amber-900/20 bg-white/40 p-6 shadow-sm backdrop-blur-sm">
          <label className="mb-2 block text-base font-medium text-amber-950">
            엑셀 파일
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="block w-full text-base text-amber-950 file:mr-4 file:rounded file:border-0 file:bg-amber-100 file:px-4 file:py-2.5 file:text-base file:font-medium file:text-amber-900 hover:file:bg-amber-200"
          />
          <p className="mt-2 text-sm text-amber-800">
            열 순서(헤더 없이): (미사용), (미사용), 등록번호, 제목, 분류코드,
            저자기호, 권차, 저자, 출판사, 출판일, 정가, ISBN, 기증자명
          </p>
          {fileName && (
            <p className="mt-2 text-sm text-amber-950">
              선택된 파일: {fileName}
            </p>
          )}
          {excelParseError && (
            <p className="mt-2 text-sm text-red-600">{excelParseError}</p>
          )}
          <p className="mt-2 text-sm text-amber-800">
            제목이 비어있거나 분류코드가 일치하지 않는 항목은 아래 표에서
            빨간색으로 표시되니, 표에서 직접 입력해 채워주세요.
          </p>
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
        onTitleChange={(id, title) => updateEntry(id, { title })}
        onCategoryMainChange={(id, mainCode) =>
          updateEntry(id, { categoryMain: mainCode, category: '' })
        }
        onCategoryChange={(id, category) => updateEntry(id, { category })}
        onAuthorCodeChange={(id, authorCode) => updateEntry(id, { authorCode })}
        onDonorNameChange={(id, donorName) =>
          updateEntry(id, { donorName, donorUserId: null })
        }
        onRegNoChange={(id, regNo) => updateEntry(id, { regNo })}
        onVolumeChange={(id, volume) => updateEntry(id, { volume })}
        emptyText="등록할 도서가 없습니다. 위에서 조회/직접 입력 또는 엑셀 업로드로 추가해주세요."
      />

      {hasInvalidRegNo && (
        <p className="text-sm text-red-600">
          등록번호 형식이 잘못되었거나 중복된 항목이 있습니다. 표에서 빨간색으로
          표시된 등록번호를 확인해주세요.
        </p>
      )}
      {hasEmptyTitle && (
        <p className="text-sm text-red-600">
          제목이 비어있는 항목이 있습니다. 표에서 빨간색으로 표시된 제목 칸을
          채워주세요.
        </p>
      )}

      <button
        type="button"
        disabled={
          entries.length === 0 ||
          hasInvalidRegNo ||
          hasEmptyTitle ||
          isSubmitting
        }
        onClick={handleSubmit}
        className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50 sm:w-auto sm:px-8">
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
