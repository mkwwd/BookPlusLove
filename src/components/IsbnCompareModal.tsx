'use client';

import { useState } from 'react';

import Modal from './Modal';

export type LookupFieldKey =
  | 'title'
  | 'author'
  | 'publisher'
  | 'page'
  | 'price'
  | 'pubDate'
  | 'volume'
  | 'coverUrl'
  | 'description';

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

export type LookupSource = 'aladin' | 'nationalLibrary';

const LOOKUP_SOURCE_LABELS: Record<LookupSource, string> = {
  aladin: '알라딘',
  nationalLibrary: '국립중앙도서관',
};

export interface LookupBookResult {
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
  aladinItemId?: number;
}

export interface IsbnLookupResponse {
  aladin: LookupBookResult | null;
  nationalLibrary: LookupBookResult | null;
}

export async function fetchIsbnLookup(
  isbn: string,
): Promise<IsbnLookupResponse> {
  const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? '서지정보 조회에 실패했습니다.');
  return body as IsbnLookupResponse;
}

export default function IsbnCompareModal({
  result,
  fields,
  currentValues,
  onApply,
  onClose,
}: {
  result: IsbnLookupResponse;
  fields: LookupFieldKey[];
  currentValues?: Partial<Record<LookupFieldKey, string>>;
  onApply: (
    values: Partial<Record<LookupFieldKey, string>>,
    aladinItemId?: number,
  ) => void;
  onClose: () => void;
}) {
  const [fieldSelection, setFieldSelection] = useState<
    Record<LookupFieldKey, LookupSource | 'none'>
  >(
    () =>
      Object.fromEntries(fields.map((key) => [key, 'none'])) as Record<
        LookupFieldKey,
        LookupSource | 'none'
      >,
  );

  const handleBulkSelect = (source: LookupSource) => {
    setFieldSelection((prev) => {
      const next = { ...prev };
      for (const key of fields) {
        if (result[source]?.[key]) next[key] = source;
      }
      return next;
    });
  };

  const handleApply = () => {
    const values: Partial<Record<LookupFieldKey, string>> = {};
    for (const key of fields) {
      const source = fieldSelection[key];
      if (source === 'none') continue;
      const value = result[source]?.[key];
      if (value) values[key] = value;
    }
    const usedAladin = Object.values(fieldSelection).some(
      (source) => source === 'aladin',
    );
    onApply(values, usedAladin ? result.aladin?.aladinItemId : undefined);
  };

  return (
    <Modal title="가져올 항목 선택" onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-800">
          현재 값과 출처별 값을 비교해서 항목마다 하나만 고르세요.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => handleBulkSelect('aladin')}
            className="rounded border border-amber-900/30 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-50">
            일괄 알라딘 선택
          </button>
          <button
            type="button"
            onClick={() => handleBulkSelect('nationalLibrary')}
            className="rounded border border-amber-900/30 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 transition hover:bg-amber-50">
            일괄 도서관 선택
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {fields.map((key) => (
          <div key={key} className="rounded border border-amber-900/10 p-3">
            <p className="mb-2 text-sm font-medium text-amber-950">
              {LOOKUP_FIELD_LABELS[key]}
            </p>
            <div className="flex gap-2">
              {(['aladin', 'nationalLibrary'] as LookupSource[]).map(
                (source) => {
                  const value = result[source]?.[key];
                  if (!value) {
                    return (
                      <div
                        key={source}
                        className="min-w-0 flex-1 rounded border border-dashed border-amber-900/15 p-2 text-xs text-amber-900/40">
                        {LOOKUP_SOURCE_LABELS[source]}: 정보 없음
                      </div>
                    );
                  }
                  const isSelected = fieldSelection[key] === source;
                  return (
                    <label
                      key={source}
                      className={`flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded border p-2 ${
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
                          <p className="text-sm break-words text-amber-800">
                            {value}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                },
              )}
              <label
                className={`flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded border p-2 ${
                  fieldSelection[key] === 'none'
                    ? 'border-red-900 bg-red-50'
                    : 'border-amber-900/20 bg-white/50 hover:bg-amber-50'
                }`}>
                <input
                  type="radio"
                  name={`lookup-${key}`}
                  checked={fieldSelection[key] === 'none'}
                  onChange={() =>
                    setFieldSelection((prev) => ({ ...prev, [key]: 'none' }))
                  }
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-amber-700">현재 값</p>
                  {key === 'coverUrl' ? (
                    currentValues?.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentValues.coverUrl}
                        alt=""
                        className="mt-1 h-16 w-11 rounded-sm object-cover"
                      />
                    ) : (
                      <p className="text-xs text-amber-900/40">없음</p>
                    )
                  ) : (
                    <p className="text-sm break-words text-amber-800">
                      {currentValues?.[key] || '(비어있음)'}
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 -mx-6 mt-4 -mb-6 flex justify-end gap-2 border-t border-amber-900/10 bg-white px-6 py-4 sm:-mx-8 sm:-mb-8 sm:px-8">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-amber-900/30 bg-white px-5 py-2.5 text-base font-medium text-amber-950 transition hover:bg-amber-50">
          취소
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
          가져오기
        </button>
      </div>
    </Modal>
  );
}
