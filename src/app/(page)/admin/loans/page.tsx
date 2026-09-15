'use client';

import { useEffect, useRef, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Barcode, ScanLine, Search, SquarePen } from 'lucide-react';

import MemberRegisterForm from '@/components/MemberRegisterForm';
import Modal from '@/components/Modal';
import { isValidRegNo, normalizeRegNoInput } from '@/lib/regNo';
import { supabase } from '@/utils/supabase/client';

import CameraScanner from '../books/new/CameraScanner';
import ManualBookEntryForm, {
  type BookCategory,
  type ScannedBook,
} from '../books/new/ManualBookEntryForm';

const STATUS_STYLE: Record<string, string> = {
  대여중: 'bg-yellow-100 text-yellow-800',
  연체중: 'bg-red-100 text-red-800',
  반납완료: 'bg-green-100 text-green-800',
};

// globals.css의 .scrollbar-visible 세로 스크롤바 두께와 맞춰야 한다.
const SCROLLBAR_WIDTH = 36;

interface CopyInfo {
  id: number;
  regNo: string;
  status: string;
  bookId: number;
}

interface BookInfo {
  id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
}

interface LoanInfo {
  id: number;
  loanedAt: string;
  dueAt: string;
}

interface BorrowerInfo {
  id: number;
  name: string;
  phone: string | null;
}

type SelectedBorrower = { id: number; name: string };

type ScanResult =
  | { status: 'not_found'; regNo: string }
  | { status: 'available'; copy: CopyInfo; book: BookInfo }
  | {
      status: 'on_loan';
      copy: CopyInfo;
      book: BookInfo;
      loan: LoanInfo;
      borrower: BorrowerInfo;
    }
  | { status: 'unavailable'; copy: CopyInfo; book: BookInfo };

interface LoanRow {
  id: number;
  title: string;
  regNo: string;
  borrowerId: number | null;
  borrowerName: string;
  loanedAt: string;
  dueAt: string;
  returnedAt: string | null;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function BorrowerPicker({
  selected,
  onSelect,
}: {
  selected: SelectedBorrower | null;
  onSelect: (borrower: SelectedBorrower | null) => void;
}) {
  const [name, setName] = useState(selected?.name ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const term = name.trim();
      setSearchTerm(selected ? '' : term);
    }, 300);
    return () => clearTimeout(timeout);
  }, [name, selected]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['borrower-search', searchTerm],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '검색에 실패했습니다.');
      return body.users as BorrowerInfo[];
    },
    enabled: searchTerm.length > 0,
  });

  const handleSelect = (borrower: SelectedBorrower) => {
    setName(borrower.name);
    onSelect(borrower);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-base font-medium text-amber-950">
        대출자
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          onSelect(null);
          setIsDropdownOpen(true);
        }}
        onFocus={() => setIsDropdownOpen(true)}
        onBlur={() => setIsDropdownOpen(false)}
        placeholder="이름으로 회원 검색"
        className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
      />
      {selected ? (
        <p className="mt-1.5 text-sm text-amber-800">✓ 회원과 연결됨</p>
      ) : (
        isDropdownOpen &&
        suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-amber-900/20 bg-white shadow-md">
            {suggestions.map((borrower) => (
              <li key={borrower.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(borrower);
                  }}
                  className="block w-full px-4 py-2 text-left text-base hover:bg-amber-50">
                  {borrower.name}
                  {borrower.phone && (
                    <span className="ml-2 text-sm text-amber-700/70">
                      {borrower.phone}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      {!selected && (
        <button
          type="button"
          onClick={() => setIsMemberModalOpen(true)}
          className="mt-2 text-sm text-amber-800 underline hover:text-amber-950">
          회원이 아닌가요? 지금 회원등록
        </button>
      )}

      {isMemberModalOpen && (
        <Modal title="회원 등록" onClose={() => setIsMemberModalOpen(false)}>
          <MemberRegisterForm
            submitLabel="등록하고 대출자로 선택"
            onSuccess={(member) => {
              handleSelect(member);
              setIsMemberModalOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function LoanManageModal({
  loan,
  onClose,
  onChanged,
}: {
  loan: LoanRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [dueAt, setDueAt] = useState(loan.dueAt);
  const bumpDueAt = (days: number) => {
    const base =
      dueAt && !Number.isNaN(new Date(dueAt).getTime())
        ? new Date(dueAt)
        : new Date();
    setDueAt(addDays(base, days));
  };
  const [selectedBorrower, setSelectedBorrower] =
    useState<SelectedBorrower | null>(
      loan.borrowerId != null
        ? { id: loan.borrowerId, name: loan.borrowerName }
        : null,
    );

  const {
    mutate: save,
    isPending: isSaving,
    error: saveError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/loans/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueAt, userId: selectedBorrower?.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '수정에 실패했습니다.');
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const {
    mutate: processReturn,
    isPending: isReturning,
    error: returnError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/loans/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: loan.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '반납 처리에 실패했습니다.');
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  const {
    mutate: unreturn,
    isPending: isUnreturning,
    error: unreturnError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/loans/${loan.id}/unreturn`, {
        method: 'POST',
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? '대출중으로 되돌리는데 실패했습니다.');
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  if (loan.returnedAt) {
    return (
      <div className="space-y-4">
        <p className="text-base text-amber-950">
          <strong>{loan.title}</strong> ({loan.regNo})
        </p>
        <p className="text-base text-amber-800">
          이미 반납 처리된 대출입니다. 반납예정일이나 대출자를 수정하려면 먼저
          대출중 상태로 되돌려주세요.
        </p>

        {unreturnError && (
          <p className="text-sm text-red-600">{unreturnError.message}</p>
        )}
        <button
          type="button"
          disabled={isUnreturning}
          onClick={() => unreturn()}
          className="w-full rounded border border-amber-900/30 bg-white px-5 py-2.5 text-base font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-50">
          {isUnreturning ? '되돌리는 중...' : '대출중으로 되돌리기'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-amber-950">
        <strong>{loan.title}</strong> ({loan.regNo})
      </p>

      <div>
        <label className="mb-1.5 block text-base font-medium text-amber-950">
          반납예정일
        </label>
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => bumpDueAt(1)}
            className="rounded border border-amber-900/20 px-3 py-1.5 text-sm text-amber-800 transition hover:bg-amber-50">
            +1일
          </button>
          <button
            type="button"
            onClick={() => bumpDueAt(7)}
            className="rounded border border-amber-900/20 px-3 py-1.5 text-sm text-amber-800 transition hover:bg-amber-50">
            +7일
          </button>
        </div>
      </div>

      <BorrowerPicker
        selected={selectedBorrower}
        onSelect={setSelectedBorrower}
      />

      {saveError && <p className="text-sm text-red-600">{saveError.message}</p>}
      <button
        type="button"
        disabled={!selectedBorrower || !dueAt || isSaving}
        onClick={() => save()}
        className="w-full rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
        {isSaving ? '수정 중...' : '수정하기'}
      </button>

      <div className="border-t border-amber-900/10 pt-4">
        {returnError && (
          <p className="mb-2 text-sm text-red-600">{returnError.message}</p>
        )}
        <button
          type="button"
          disabled={isReturning}
          onClick={() => processReturn()}
          className="w-full rounded border border-amber-900/30 bg-white px-5 py-2.5 text-base font-medium text-amber-950 transition hover:bg-amber-50 disabled:opacity-50">
          {isReturning ? '반납 처리 중...' : '반납 처리'}
        </button>
      </div>
    </div>
  );
}

export default function AdminLoansPage() {
  const [regNoInput, setRegNoInput] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [selectedBorrower, setSelectedBorrower] =
    useState<SelectedBorrower | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | '대여중' | '연체중' | '반납완료'
  >('all');
  const [managingLoan, setManagingLoan] = useState<LoanRow | null>(null);

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

  const {
    mutate: scanRegNo,
    data: scanResult,
    isPending: isScanning,
    error: scanError,
    reset: resetScan,
  } = useMutation({
    mutationFn: async (regNo: string) => {
      const res = await fetch(
        `/api/admin/loans/scan?regNo=${encodeURIComponent(regNo)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '조회에 실패했습니다.');
      return body as ScanResult;
    },
    onSuccess: (result) => {
      setSelectedBorrower(null);
      if (result.status === 'available') {
        setDueAt(addDays(new Date(), 14));
      }
      if (result.status === 'not_found') {
        setIsBookModalOpen(true);
      }
    },
  });

  const handleScan = (rawRegNo?: string) => {
    const regNo = normalizeRegNoInput(rawRegNo ?? regNoInput).trim();
    if (!regNo) return;
    if (!isValidRegNo(regNo)) {
      setRegNoInput(regNo);
      return;
    }
    setRegNoInput(regNo);
    scanRegNo(regNo);
  };

  const {
    data: loansData,
    refetch: refetchLoans,
    isLoading: isLoansLoading,
  } = useQuery({
    queryKey: ['admin-loans'],
    queryFn: async () => {
      const res = await fetch('/api/admin/loans');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '목록 조회에 실패했습니다.');
      return body.loans as LoanRow[];
    },
  });

  const {
    mutate: registerBookAndContinue,
    isPending: isRegisteringBook,
    error: registerBookError,
  } = useMutation({
    mutationFn: async (book: ScannedBook) => {
      let coverUrl = book.coverUrl;
      if (book.coverFile) {
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
        coverUrl = coverBody.url;
      }

      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          books: [{ ...book, coverUrl, coverFile: undefined }],
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '등록에 실패했습니다.');
      if (body.failed?.length > 0) {
        throw new Error(body.failed[0].error);
      }
      return book.regNo;
    },
    onSuccess: (regNo) => {
      setIsBookModalOpen(false);
      scanRegNo(regNo);
    },
  });

  const {
    mutate: checkout,
    isPending: isCheckingOut,
    error: checkoutError,
  } = useMutation({
    mutationFn: async () => {
      if (scanResult?.status !== 'available' || !selectedBorrower) return;
      const res = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookCopyId: scanResult.copy.id,
          userId: selectedBorrower.id,
          dueAt,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '대출 처리에 실패했습니다.');
    },
    onSuccess: () => {
      resetScan();
      setRegNoInput('');
      void refetchLoans();
    },
  });

  const {
    mutate: processReturn,
    isPending: isReturning,
    error: returnError,
  } = useMutation({
    mutationFn: async (loanId: number) => {
      const res = await fetch('/api/admin/loans/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '반납 처리에 실패했습니다.');
    },
    onSuccess: () => {
      resetScan();
      setRegNoInput('');
      void refetchLoans();
    },
  });

  const trimmedSearch = searchText.trim();
  const loansWithStatus = (loansData ?? []).map((loan) => {
    const status = loan.returnedAt
      ? '반납완료'
      : loan.dueAt < todayString()
        ? '연체중'
        : '대여중';
    return { ...loan, computedStatus: status };
  });
  const statusCounts = {
    all: loansWithStatus.length,
    대여중: loansWithStatus.filter((l) => l.computedStatus === '대여중').length,
    연체중: loansWithStatus.filter((l) => l.computedStatus === '연체중').length,
    반납완료: loansWithStatus.filter((l) => l.computedStatus === '반납완료')
      .length,
  };
  const visibleLoans = loansWithStatus.filter(
    (loan) =>
      (statusFilter === 'all' || loan.computedStatus === statusFilter) &&
      (!trimmedSearch ||
        loan.title.includes(trimmedSearch) ||
        loan.borrowerName.includes(trimmedSearch)),
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 세로 휠 스크롤을 가로 스크롤로 변환 (PC에서 Shift 없이도 옆으로 넘어가게).
    // React의 onWheel은 패시브 리스너로 붙어서 preventDefault가 무시되니,
    // 직접 { passive: false }로 등록해야 실제로 페이지 스크롤이 막힌다.
    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      // 세로 스크롤바(오른쪽 끝, globals.css 두께와 맞춤) 위에서는 원래
      // 세로 스크롤 동작을 그대로 둔다.
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.right - SCROLLBAR_WIDTH) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl text-amber-950">대출/대여 관리</h2>
      </div>

      <div className="rounded-lg border border-amber-900/20 bg-white/40 p-6 shadow-sm backdrop-blur-sm">
        <label className="mb-1.5 flex items-center gap-1.5 text-base font-medium text-amber-950">
          <Barcode className="h-4 w-4" />
          등록번호 스캔
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={regNoInput}
            onChange={(e) => {
              if ((e.nativeEvent as InputEvent).isComposing) {
                setRegNoInput(e.target.value);
                return;
              }
              setRegNoInput(normalizeRegNoInput(e.target.value));
            }}
            onCompositionEnd={(e) =>
              setRegNoInput(normalizeRegNoInput(e.currentTarget.value))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleScan();
              }
            }}
            placeholder="바코드를 스캔하거나 등록번호를 입력해주세요 (예: MB123456)"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
          <button
            type="button"
            disabled={isScanning}
            onClick={() => handleScan()}
            className="shrink-0 rounded bg-amber-900/90 px-5 py-2.5 text-base font-medium text-white transition hover:bg-amber-900 disabled:opacity-50">
            {isScanning ? '조회 중...' : '조회'}
          </button>
        </div>
        {scanError && (
          <p className="mt-1.5 text-sm text-red-600">{scanError.message}</p>
        )}

        {!isCameraOpen && (
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="mt-3 flex items-center gap-1.5 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-950 transition hover:bg-amber-50">
            <ScanLine className="h-4 w-4" />
            카메라로 스캔
          </button>
        )}
        {isCameraOpen && (
          <div className="mt-3">
            <CameraScanner
              onDetected={(regNo) => {
                handleScan(regNo);
                setIsCameraOpen(false);
              }}
              onClose={() => setIsCameraOpen(false)}
              validate={isValidRegNo}
              invalidMessage={(code) =>
                `등록번호 바코드가 아닙니다 (${code}). MB로 시작하는 등록번호 바코드를 비춰주세요.`
              }
            />
          </div>
        )}

        {scanResult?.status === 'not_found' && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 text-base text-amber-800">
            <p>
              등록번호 &quot;{scanResult.regNo}&quot;는 등록되지 않은 책이에요.
            </p>
            <button
              type="button"
              onClick={() => setIsBookModalOpen(true)}
              className="mt-2 rounded bg-red-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800">
              지금 등록하고 대출 진행하기
            </button>
          </div>
        )}

        {scanResult?.status === 'unavailable' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-base text-red-700">
            &quot;{scanResult.book.title}&quot; ({scanResult.copy.regNo})은(는)
            현재 상태가 &quot;{scanResult.copy.status}&quot;라서 대출할 수
            없어요.
          </div>
        )}

        {scanResult?.status === 'on_loan' && (
          <div className="mt-4 rounded-lg border border-amber-900/20 bg-white px-5 py-4">
            <p className="text-base text-amber-950">
              <strong>{scanResult.book.title}</strong> ({scanResult.copy.regNo}
              )은(는) <strong>{scanResult.borrower.name}</strong>님이 대출
              중입니다.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              대출일 {scanResult.loan.loanedAt.slice(0, 10)} · 반납예정일{' '}
              {scanResult.loan.dueAt}
            </p>
            {returnError && (
              <p className="mt-1.5 text-sm text-red-600">
                {returnError.message}
              </p>
            )}
            <button
              type="button"
              disabled={isReturning}
              onClick={() => processReturn(scanResult.loan.id)}
              className="mt-3 rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
              {isReturning ? '반납 처리 중...' : '반납 처리'}
            </button>
          </div>
        )}

        {scanResult?.status === 'available' && (
          <div
            key={scanResult.copy.id}
            className="mt-4 space-y-3 rounded-lg border border-amber-900/20 bg-white px-5 py-4">
            <p className="text-base text-amber-950">
              <strong>{scanResult.book.title}</strong> ({scanResult.copy.regNo}
              )은(는) 대출 가능합니다.
            </p>
            <BorrowerPicker
              selected={selectedBorrower}
              onSelect={setSelectedBorrower}
            />
            <div>
              <label className="mb-1.5 block text-base font-medium text-amber-950">
                반납예정일
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none sm:w-auto"
              />
            </div>
            {checkoutError && (
              <p className="text-sm text-red-600">{checkoutError.message}</p>
            )}
            <button
              type="button"
              disabled={!selectedBorrower || !dueAt || isCheckingOut}
              onClick={() => checkout()}
              className="rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
              {isCheckingOut ? '대출 처리 중...' : '대출 처리'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', '대여중', '연체중', '반납완료'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              statusFilter === key
                ? 'bg-red-900 text-white'
                : 'border border-amber-900/30 bg-white/40 text-amber-950 hover:bg-amber-50'
            }`}>
            {key === 'all' ? '전체' : key} ({statusCounts[key]})
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-950" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="도서명 또는 회원명 검색"
          className="w-full rounded border border-amber-900/30 bg-white/40 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
        />
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-visible max-h-[70vh] max-w-full overflow-auto rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
        <table className="w-full min-w-max text-left text-base whitespace-nowrap">
          <thead className="border-b border-amber-900/20 text-amber-800">
            <tr>
              <th className="px-5 py-3 font-medium">도서명</th>
              <th className="px-5 py-3 font-medium">대출자</th>
              <th className="px-5 py-3 font-medium">대출일</th>
              <th className="px-5 py-3 font-medium">반납예정일</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {isLoansLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  불러오는 중...
                </td>
              </tr>
            ) : visibleLoans.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-amber-900/50">
                  대출 기록이 없습니다.
                </td>
              </tr>
            ) : (
              visibleLoans.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-5 py-3 text-amber-950">{loan.title}</td>
                  <td className="px-5 py-3 text-amber-950">
                    {loan.borrowerName}
                  </td>
                  <td className="px-5 py-3 text-amber-800">
                    {loan.loanedAt.slice(0, 10)}
                  </td>
                  <td className="px-5 py-3 text-amber-800">{loan.dueAt}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded px-2 py-1 text-sm font-medium ${STATUS_STYLE[loan.computedStatus]}`}>
                      {loan.computedStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      aria-label="관리"
                      onClick={() => setManagingLoan(loan)}
                      className="text-amber-600 hover:text-amber-950">
                      <SquarePen className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isBookModalOpen && (
        <Modal title="도서 등록" onClose={() => setIsBookModalOpen(false)}>
          {registerBookError && (
            <p className="mb-3 text-sm text-red-600">
              {registerBookError.message}
            </p>
          )}
          <ManualBookEntryForm
            categories={categories}
            initialRegNo={
              scanResult?.status === 'not_found' ? scanResult.regNo : ''
            }
            submitLabel={
              isRegisteringBook ? '등록 중...' : '등록하고 대출 진행'
            }
            onSubmit={(book) => registerBookAndContinue(book)}
          />
        </Modal>
      )}

      {managingLoan && (
        <Modal title="대출 관리" onClose={() => setManagingLoan(null)}>
          <LoanManageModal
            loan={managingLoan}
            onClose={() => setManagingLoan(null)}
            onChanged={() => void refetchLoans()}
          />
        </Modal>
      )}
    </div>
  );
}
