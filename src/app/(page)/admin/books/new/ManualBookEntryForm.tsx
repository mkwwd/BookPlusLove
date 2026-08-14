'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Barcode, ScanLine } from 'lucide-react';

import Modal from '@/components/Modal';
import PhotoCapture from '@/components/PhotoCapture';
import { generateAuthorCode } from '@/lib/authorCode';
import { isValidIsbn13 } from '@/lib/isbn';
import { isValidRegNo, normalizeRegNoInput } from '@/lib/regNo';

import CameraScanner from './CameraScanner';

type LookupFieldKey =
  | 'title'
  | 'author'
  | 'publisher'
  | 'page'
  | 'price'
  | 'pubDate'
  | 'volume'
  | 'coverUrl'
  | 'description';

const LOOKUP_FIELD_KEYS = Object.keys({
  title: '',
  author: '',
  publisher: '',
  page: '',
  price: '',
  pubDate: '',
  volume: '',
  coverUrl: '',
  description: '',
} satisfies Record<LookupFieldKey, string>) as LookupFieldKey[];

const LOOKUP_FIELD_LABELS: Record<LookupFieldKey, string> = {
  title: '제목',
  author: '저자',
  publisher: '출판사',
  page: '페이지',
  price: '정가',
  pubDate: '출판일',
  volume: '권차',
  coverUrl: '표지',
  description: '설명',
};

type LookupSource = 'aladin' | 'nationalLibrary';

const LOOKUP_SOURCE_LABELS: Record<LookupSource, string> = {
  aladin: '알라딘',
  nationalLibrary: '국립중앙도서관',
};

interface LookupBookResult {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl?: string;
  description?: string;
  page?: string;
  price?: string;
  pubDate?: string;
  volume?: string;
}

interface IsbnLookupResponse {
  aladin: LookupBookResult | null;
  nationalLibrary: LookupBookResult | null;
}

export interface ScannedBook {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl?: string;
  coverFile?: File;
  description?: string;
  page?: string;
  price?: string;
  pubDate?: string;
  volume?: string;
  category: string;
  categoryMain: string;
  authorCode: string;
  donorName: string;
  donorUserId?: number | null;
  regNo: string;
}

export interface DonorUser {
  id: number;
  name: string;
  phone: string | null;
}

export interface BookCategory {
  code: string;
  label: string;
  main_code: string;
  main_label: string;
}

async function fetchIsbnLookup(isbn: string): Promise<IsbnLookupResponse> {
  const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? '서지정보 조회에 실패했습니다.');
  }
  return body as IsbnLookupResponse;
}

export default function ManualBookEntryForm({
  categories,
  existingRegNos = [],
  initialRegNo = '',
  submitLabel = '목록에 추가',
  onSubmit,
  onReset,
}: {
  categories: BookCategory[];
  existingRegNos?: string[];
  initialRegNo?: string;
  submitLabel?: string;
  onSubmit: (book: ScannedBook) => void;
  onReset?: () => void;
}) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCoverCameraOpen, setIsCoverCameraOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualPage, setManualPage] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualPubDate, setManualPubDate] = useState('');
  const [manualVolume, setManualVolume] = useState('');
  const [manualCoverUrl, setManualCoverUrl] = useState('');
  const [manualCoverFile, setManualCoverFile] = useState<File | null>(null);
  const [manualCoverPreview, setManualCoverPreview] = useState('');
  const [manualDescription, setManualDescription] = useState<
    string | undefined
  >();
  const [manualCategoryMain, setManualCategoryMain] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualAuthorCode, setManualAuthorCode] = useState('');
  const [manualRegNo, setManualRegNo] = useState(initialRegNo);
  const [manualDonorName, setManualDonorName] = useState('');
  const [manualDonorUserId, setManualDonorUserId] = useState<number | null>(
    null,
  );
  const [isDonorDropdownOpen, setIsDonorDropdownOpen] = useState(false);
  const [donorSearchTerm, setDonorSearchTerm] = useState('');
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [manualIsbnError, setManualIsbnError] = useState<string | null>(null);
  const [lookupPreview, setLookupPreview] = useState<IsbnLookupResponse | null>(
    null,
  );
  const [fieldSelection, setFieldSelection] = useState<
    Record<LookupFieldKey, LookupSource | 'none'>
  >({
    title: 'none',
    author: 'none',
    publisher: 'none',
    page: 'none',
    price: 'none',
    pubDate: 'none',
    volume: 'none',
    coverUrl: 'none',
    description: 'none',
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      const term = manualDonorName.trim();
      setDonorSearchTerm(manualDonorUserId ? '' : term);
    }, 300);
    return () => clearTimeout(timeout);
  }, [manualDonorName, manualDonorUserId]);

  const { data: donorSuggestions = [] } = useQuery({
    queryKey: ['donor-search', donorSearchTerm],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(donorSearchTerm)}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '검색에 실패했습니다.');
      return body.users as DonorUser[];
    },
    enabled: donorSearchTerm.length > 0,
  });

  const handleSelectDonor = (donor: DonorUser) => {
    setManualDonorName(donor.name);
    setManualDonorUserId(donor.id);
    setDonorSearchTerm('');
    setIsDonorDropdownOpen(false);
  };

  const manualMainOptions = Array.from(
    new Map(categories.map((c) => [c.main_code, c.main_label])).entries(),
  );

  const trimmedManualRegNo = manualRegNo.trim();
  const manualRegNoError = !trimmedManualRegNo
    ? null
    : !isValidRegNo(trimmedManualRegNo)
      ? 'MB+숫자 6자리 형식이어야 합니다 (예: MB123456).'
      : existingRegNos.some((r) => r.trim() === trimmedManualRegNo)
        ? '이미 목록에 있는 등록번호입니다.'
        : null;

  const {
    mutate: lookupManualIsbn,
    isPending: isManualLookingUp,
    error: manualLookupError,
  } = useMutation({
    mutationFn: fetchIsbnLookup,
    onSuccess: (result) => {
      setLookupPreview(result);
      // 아무것도 자동으로 고르지 않는다 — 관리자가 항목별로 직접
      // 골라야만 실제로 가져와진다.
      const nextSelection = {} as Record<LookupFieldKey, LookupSource | 'none'>;
      for (const key of LOOKUP_FIELD_KEYS) {
        nextSelection[key] = 'none';
      }
      setFieldSelection(nextSelection);
    },
  });

  const getSelectedLookupValue = (key: LookupFieldKey): string | undefined => {
    if (!lookupPreview) return undefined;
    const source = fieldSelection[key];
    if (source === 'none') return undefined;
    return lookupPreview[source]?.[key];
  };

  const handleApplyLookup = () => {
    if (!lookupPreview) return;
    const title = getSelectedLookupValue('title') ?? manualTitle;
    const author = getSelectedLookupValue('author') ?? manualAuthor;

    if (fieldSelection.title !== 'none') setManualTitle(title);
    if (fieldSelection.author !== 'none') setManualAuthor(author);
    if (fieldSelection.publisher !== 'none')
      setManualPublisher(getSelectedLookupValue('publisher') ?? '');
    if (fieldSelection.page !== 'none')
      setManualPage(getSelectedLookupValue('page') ?? '');
    if (fieldSelection.price !== 'none')
      setManualPrice(getSelectedLookupValue('price') ?? '');
    if (fieldSelection.pubDate !== 'none')
      setManualPubDate(getSelectedLookupValue('pubDate') ?? '');
    if (fieldSelection.volume !== 'none')
      setManualVolume(getSelectedLookupValue('volume') ?? '');
    if (fieldSelection.coverUrl !== 'none')
      setManualCoverUrl(getSelectedLookupValue('coverUrl') ?? '');
    if (fieldSelection.description !== 'none')
      setManualDescription(getSelectedLookupValue('description'));
    if (fieldSelection.title !== 'none' || fieldSelection.author !== 'none') {
      setManualAuthorCode(generateAuthorCode(author, title) ?? '');
    }
    setLookupPreview(null);
  };

  const applyCoverFile = (file: File) => {
    // 실제 업로드는 "등록하기"(진짜 DB 저장) 시점에만 한다. 여기서는
    // 미리보기용 blob URL만 만들고 파일은 항목에 들고만 있는다.
    if (manualCoverPreview) URL.revokeObjectURL(manualCoverPreview);
    setManualCoverFile(file);
    setManualCoverUrl('');
    setManualCoverPreview(URL.createObjectURL(file));
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyCoverFile(file);
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

  const buildManualEntry = (): ScannedBook => {
    const title = manualTitle.trim();
    const author = manualAuthor.trim();
    return {
      id: crypto.randomUUID(),
      isbn: manualIsbn.trim(),
      title,
      author,
      publisher: manualPublisher.trim(),
      page: manualPage.trim() || undefined,
      price: manualPrice.trim() || undefined,
      pubDate: manualPubDate.trim() || undefined,
      volume: manualVolume.trim() || undefined,
      // 실제 업로드 전이라 blob 미리보기 URL을 임시로 들고 있다가,
      // 실제 등록 시점에 실제 URL로 교체한다.
      coverUrl: manualCoverPreview || manualCoverUrl.trim() || undefined,
      coverFile: manualCoverFile ?? undefined,
      description: manualDescription,
      category: manualCategory,
      categoryMain: manualCategoryMain,
      authorCode:
        manualAuthorCode.trim() || generateAuthorCode(author, title) || '',
      donorName: manualDonorName.trim(),
      donorUserId: manualDonorUserId,
      regNo: manualRegNo.trim(),
    };
  };

  const resetManualForm = () => {
    setManualTitle('');
    setManualAuthor('');
    setManualPublisher('');
    setManualIsbn('');
    setManualPage('');
    setManualPrice('');
    setManualPubDate('');
    setManualVolume('');
    setManualCoverUrl('');
    // blob 미리보기는 revoke하지 않는다 — 방금 만든 항목이 그 URL을
    // 계속 표시용으로 쓰고 있어서, 여기서 지우면 표에서 깨져 보인다.
    setManualCoverFile(null);
    setManualCoverPreview('');
    setManualDescription(undefined);
    setManualCategoryMain('');
    setManualCategory('');
    setManualAuthorCode('');
    setManualRegNo('');
    setManualDonorName('');
    setManualDonorUserId(null);
    setIsDonorDropdownOpen(false);
    setManualIsbnError(null);
    setIsCameraOpen(false);
    setIsCoverCameraOpen(false);
    onReset?.();
  };

  const handleAddManualEntry = () => {
    if (!manualTitle.trim()) {
      setManualFormError('제목은 필수입니다.');
      return;
    }
    if (manualRegNoError) {
      setManualFormError(manualRegNoError);
      return;
    }
    setManualFormError(null);
    onSubmit(buildManualEntry());
    resetManualForm();
  };

  const handleResetManualForm = () => {
    if (manualCoverPreview) URL.revokeObjectURL(manualCoverPreview);
    resetManualForm();
    setManualFormError(null);
  };

  const handleAutoGenerateAuthorCode = () => {
    setManualAuthorCode(
      generateAuthorCode(manualAuthor.trim(), manualTitle.trim()) ?? '',
    );
  };

  return (
    <div className="rounded-lg border border-amber-900/20 bg-white/40 p-6 shadow-sm backdrop-blur-sm">
      <p className="mb-4 text-sm text-amber-800">
        ISBN이 있으면 스캔하거나 입력해서 조회하고, 없는 책은 아래 항목을 직접
        입력해주세요.
      </p>
      <div className="mb-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-base font-medium text-amber-950">
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
        <p className="mt-1.5 text-sm text-amber-800">
          조회하면 조회된 항목을 팝업으로 보여드려요. 가져올 항목만 골라서 채워
          넣을 수 있어요.
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
            className="mt-3 flex items-center gap-1.5 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-950 transition hover:bg-amber-50">
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
              validate={isValidIsbn13}
              invalidMessage={(code) =>
                `ISBN 바코드가 아닙니다 (${code}). 위쪽의 ISBN 바코드를 비춰주세요.`
              }
            />
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
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
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            출판일
          </label>
          <input
            type="text"
            value={manualPubDate}
            onChange={(e) => setManualPubDate(e.target.value)}
            placeholder="예: 2017년 3월 31일"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            권차
          </label>
          <input
            type="text"
            value={manualVolume}
            onChange={(e) => setManualVolume(e.target.value)}
            placeholder="예: 2"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            등록번호
          </label>
          <input
            type="text"
            value={manualRegNo}
            onChange={(e) => {
              if ((e.nativeEvent as InputEvent).isComposing) {
                setManualRegNo(e.target.value);
                return;
              }
              setManualRegNo(normalizeRegNoInput(e.target.value));
            }}
            onCompositionEnd={(e) =>
              setManualRegNo(normalizeRegNoInput(e.currentTarget.value))
            }
            placeholder="예: MB123456"
            className={`w-full rounded border bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:outline-none ${
              manualRegNoError
                ? 'border-red-400 focus:ring-red-300'
                : 'border-amber-900/20 focus:ring-amber-900/30'
            }`}
          />
          {manualRegNoError && (
            <p className="mt-1.5 text-sm text-red-600">{manualRegNoError}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            저자기호
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAuthorCode}
              onChange={(e) => setManualAuthorCode(e.target.value)}
              placeholder="예: 게68ㄴ"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAutoGenerateAuthorCode}
              className="shrink-0 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base text-amber-950 transition hover:bg-amber-50">
              자동생성
            </button>
          </div>
        </div>
        <div className="relative">
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            기증자명
          </label>
          <input
            type="text"
            value={manualDonorName}
            onChange={(e) => {
              setManualDonorName(e.target.value);
              setManualDonorUserId(null);
              setIsDonorDropdownOpen(true);
            }}
            onFocus={() => setIsDonorDropdownOpen(true)}
            onBlur={() => setIsDonorDropdownOpen(false)}
            placeholder="이름으로 회원 검색 또는 직접 입력"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
          {manualDonorUserId ? (
            <p className="mt-1.5 text-sm text-amber-800">✓ 회원과 연결됨</p>
          ) : (
            isDonorDropdownOpen &&
            donorSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-amber-900/20 bg-white shadow-md">
                {donorSuggestions.map((donor) => (
                  <li key={donor.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectDonor(donor);
                      }}
                      className="block w-full px-4 py-2 text-left text-base hover:bg-amber-50">
                      {donor.name}
                      {donor.phone && (
                        <span className="ml-2 text-sm text-amber-700/70">
                          {donor.phone}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            분류코드
          </label>
          <div className="flex gap-2">
            <select
              value={manualCategoryMain}
              onChange={(e) => {
                setManualCategoryMain(e.target.value);
                setManualCategory('');
              }}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <option value="">대분류</option>
              {manualMainOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {code} {label}
                </option>
              ))}
            </select>
            <select
              value={manualCategory}
              disabled={!manualCategoryMain}
              onChange={(e) => setManualCategory(e.target.value)}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-3 py-2.5 text-base text-amber-950 focus:ring-2 focus:ring-amber-900/30 focus:outline-none disabled:opacity-50">
              <option value="">세부분류</option>
              {categories
                .filter((c) => c.main_code === manualCategoryMain)
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
          <div className="flex items-center gap-3">
            {manualCoverPreview || manualCoverUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={manualCoverPreview || manualCoverUrl.trim()}
                alt=""
                className="h-14 w-10 shrink-0 rounded-sm object-cover"
              />
            ) : (
              <div className="h-14 w-10 shrink-0 rounded-sm bg-amber-100" />
            )}
            <input
              type="text"
              value={manualCoverUrl}
              onChange={(e) => {
                setManualCoverUrl(e.target.value);
                if (manualCoverFile) {
                  if (manualCoverPreview)
                    URL.revokeObjectURL(manualCoverPreview);
                  setManualCoverFile(null);
                  setManualCoverPreview('');
                }
              }}
              placeholder="URL을 붙여넣거나 오른쪽에서 파일을 선택해주세요"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-2.5 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
            <label className="shrink-0 cursor-pointer rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base whitespace-nowrap text-amber-950 transition hover:bg-amber-50">
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
              className="shrink-0 rounded border border-amber-900/30 bg-white/50 px-4 py-2.5 text-base whitespace-nowrap text-amber-950 transition hover:bg-amber-50">
              사진으로 촬영
            </button>
          </div>
          {manualCoverFile && (
            <p className="mt-1.5 text-sm text-amber-800">
              선택된 파일: {manualCoverFile.name} (실제 등록할 때 업로드됩니다)
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
      {manualFormError && (
        <p className="mt-3 text-sm text-red-600">{manualFormError}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleResetManualForm}
          className="rounded border border-amber-900/30 bg-white px-5 py-2.5 text-base font-medium text-amber-950 transition hover:bg-amber-50">
          초기화
        </button>
        <button
          type="button"
          onClick={handleAddManualEntry}
          className="rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
          {submitLabel}
        </button>
      </div>
      {lookupPreview && (
        <Modal title="가져올 항목 선택" onClose={() => setLookupPreview(null)}>
          <p className="mb-3 text-sm text-amber-800">
            출처별로 값을 비교해서 항목마다 하나만 고르거나, 가져오지 않을 수도
            있어요.
          </p>
          <div className="space-y-3">
            {LOOKUP_FIELD_KEYS.filter(
              (key) =>
                lookupPreview.aladin?.[key] ||
                lookupPreview.nationalLibrary?.[key],
            ).map((key) => (
              <div key={key} className="rounded border border-amber-900/10 p-3">
                <p className="mb-2 text-sm font-medium text-amber-950">
                  {LOOKUP_FIELD_LABELS[key]}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(['aladin', 'nationalLibrary'] as LookupSource[]).map(
                    (source) => {
                      const value = lookupPreview[source]?.[key];
                      if (!value) {
                        return (
                          <div
                            key={source}
                            className="rounded border border-dashed border-amber-900/15 p-2 text-xs text-amber-900/40">
                            {LOOKUP_SOURCE_LABELS[source]}: 정보 없음
                          </div>
                        );
                      }
                      const isSelected = fieldSelection[key] === source;
                      return (
                        <label
                          key={source}
                          className={`flex cursor-pointer items-start gap-2 rounded border p-2 ${
                            isSelected
                              ? 'border-red-900 bg-red-50'
                              : 'border-amber-900/20 bg-white/50 hover:bg-amber-50'
                          }`}>
                          <input
                            type="radio"
                            name={`lookup-${key}`}
                            checked={isSelected}
                            onChange={() =>
                              setFieldSelection((prev) => ({
                                ...prev,
                                [key]: source,
                              }))
                            }
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-amber-700">
                              {LOOKUP_SOURCE_LABELS[source]}
                            </p>
                            {key === 'coverUrl' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={value}
                                alt=""
                                className="mt-1 h-16 w-11 rounded-sm object-cover"
                              />
                            ) : (
                              <p className="truncate text-sm text-amber-800">
                                {value}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    },
                  )}
                  <label
                    className={`flex cursor-pointer items-center justify-center rounded border p-2 text-sm font-medium ${
                      fieldSelection[key] === 'none'
                        ? 'border-red-900 bg-red-50 text-red-800'
                        : 'border-amber-900/20 bg-white/50 text-amber-700 hover:bg-amber-50'
                    }`}>
                    <input
                      type="radio"
                      name={`lookup-${key}`}
                      checked={fieldSelection[key] === 'none'}
                      onChange={() =>
                        setFieldSelection((prev) => ({
                          ...prev,
                          [key]: 'none',
                        }))
                      }
                      className="sr-only"
                    />
                    가져오지 않음
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLookupPreview(null)}
              className="rounded border border-amber-900/30 bg-white px-5 py-2.5 text-base font-medium text-amber-950 transition hover:bg-amber-50">
              취소
            </button>
            <button
              type="button"
              onClick={handleApplyLookup}
              className="rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
              가져오기
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
