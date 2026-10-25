'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

import Modal from '@/components/Modal';
import type { CategoryInput, ParishInput } from '@/lib/adminCatalog';

type Kind = 'parishes' | 'categories';
type ParishRow = ParishInput & { id: number; usageCount: number };
type CategoryRow = CategoryInput & { usageCount: number };
interface Entry {
  key: string;
  name: string;
  usageCount: number;
  approved?: boolean;
  mainCode?: string;
  mainLabel?: string;
}
const inputClass =
  'w-full rounded border border-amber-900/25 bg-white px-3 py-2.5 text-base text-amber-950 disabled:bg-gray-100';
const iconClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-amber-900/20 text-amber-900 hover:bg-amber-50 disabled:opacity-40';
const PAGE_SIZE = 25;

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? '처리하지 못했습니다. 다시 시도해주세요.');
  return body;
}

export default function CatalogManager({ kind }: { kind: Kind }) {
  const isParish = kind === 'parishes';
  const title = isParish ? '본당 관리' : '분류코드 관리';
  const endpoint = `/api/admin/${kind}`;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    approved: true,
    code: '',
    mainCode: '',
    mainLabel: '',
  });

  const list = useQuery<Entry[]>({
    queryKey: [`admin-${kind}`],
    queryFn: async () => {
      const body = await requestJson(endpoint);
      return isParish
        ? (body.items as ParishRow[]).map((row) => ({
            key: String(row.id),
            name: row.parishname,
            approved: row.is_verified,
            usageCount: row.usageCount,
          }))
        : (body.items as CategoryRow[]).map((row) => ({
            key: row.code,
            name: row.label,
            mainCode: row.main_code,
            mainLabel: row.main_label,
            usageCount: row.usageCount,
          }));
    },
  });
  const entries = list.data ?? [];
  const groups = new Map(
    entries
      .filter((row) => row.mainCode)
      .map((row) => [row.mainCode!, row.mainLabel!]),
  );
  const refresh = async () => {
    await Promise.all(
      [
        `admin-${kind}`,
        isParish ? 'parishes' : 'book-categories',
        isParish ? 'admin-members' : 'admin-books',
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  };
  const save = useMutation({
    mutationFn: () =>
      requestJson(
        editing ? `${endpoint}/${encodeURIComponent(editing.key)}` : endpoint,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isParish
              ? { parishname: form.name, is_verified: form.approved }
              : {
                  code: form.code,
                  label: form.name,
                  main_code: form.mainCode,
                  main_label: form.mainLabel,
                },
          ),
        },
      ),
    onSuccess: async () => {
      setShowForm(false);
      setMessage('저장했습니다.');
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (row: Entry) =>
      requestJson(`${endpoint}/${encodeURIComponent(row.key)}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      setMessage('삭제했습니다.');
      await refresh();
    },
  });
  const approve = useMutation({
    mutationFn: (row: Entry) =>
      requestJson(`${endpoint}/${row.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parishname: row.name, is_verified: true }),
      }),
    onSuccess: async () => {
      setMessage('승인했습니다.');
      await refresh();
    },
  });
  const busy = save.isPending || remove.isPending || approve.isPending;
  const openForm = (row: Entry | null) => {
    setEditing(row);
    setForm({
      name: row?.name ?? '',
      approved: row?.approved ?? true,
      code: row?.key ?? '',
      mainCode: row?.mainCode ?? '',
      mainLabel: row?.mainLabel ?? '',
    });
    save.reset();
    remove.reset();
    approve.reset();
    setMessage('');
    setShowForm(true);
  };
  const filtered = entries.filter((row) => {
    const matches =
      `${row.key} ${row.name} ${row.mainCode ?? ''} ${row.mainLabel ?? ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    return (
      matches &&
      (filter === 'all' ||
        (isParish
          ? row.approved === (filter === 'approved')
          : row.mainCode === filter))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <Link
        href={isParish ? '/admin/members' : '/admin/books'}
        className="inline-flex min-h-11 items-center gap-2 text-base text-amber-800 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900">
        <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
        {isParish ? '회원 관리로 돌아가기' : '도서 관리로 돌아가기'}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl text-amber-950">{title}</h2>
        <button
          type="button"
          disabled={busy || list.isError || list.isLoading}
          onClick={() => openForm(null)}
          className="flex items-center gap-2 rounded bg-red-900 px-4 py-2.5 text-white disabled:opacity-50">
          <Plus size={18} />
          {isParish ? '본당 추가' : '코드 추가'}
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            aria-hidden="true"
            className="absolute top-3.5 left-3 text-amber-800"
            size={20}
          />
          <input
            aria-label={isParish ? '본당 검색' : '분류코드 검색'}
            placeholder={isParish ? '본당명 검색' : '코드 또는 분류명 검색'}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          aria-label={isParish ? '승인 상태' : '대분류 필터'}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
          className={`${inputClass} sm:w-52`}>
          <option value="all">전체</option>
          {isParish ? (
            <>
              <option value="pending">승인 대기</option>
              <option value="approved">승인 완료</option>
            </>
          ) : (
            [...groups].map(([code, label]) => (
              <option key={code} value={code}>
                {code} {label}
              </option>
            ))
          )}
        </select>
      </div>
      <p aria-live="polite" className="text-green-800">
        {message}
      </p>
      {(remove.error || approve.error) && (
        <p role="alert" className="text-red-700">
          {remove.error?.message ?? approve.error?.message}
        </p>
      )}
      {list.isLoading ? (
        <p className="py-8 text-center">불러오는 중...</p>
      ) : list.isError ? (
        <div role="alert" className="space-y-3 text-red-700">
          <p>{list.error.message}</p>
          <button
            type="button"
            onClick={() => void list.refetch()}
            className="underline">
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <p className="text-amber-800">총 {filtered.length}개</p>
          <ul className="divide-y divide-amber-900/15 border-y border-amber-900/20">
            {visible.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-lg font-medium break-words text-amber-950">
                    {!isParish && (
                      <span className="mr-3 font-mono">{row.key}</span>
                    )}
                    {row.name}
                  </p>
                  <p className="mt-1 text-base text-amber-800">
                    {isParish
                      ? `${row.approved ? '승인 완료' : '승인 대기'} · 회원 ${row.usageCount}명`
                      : `${row.mainCode} ${row.mainLabel} · 도서 ${row.usageCount}종`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isParish && !row.approved && (
                    <button
                      type="button"
                      title="승인"
                      aria-label={`${row.name} 승인`}
                      disabled={busy}
                      onClick={() => approve.mutate(row)}
                      className={iconClass}>
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="수정"
                    aria-label={`${row.name} 수정`}
                    disabled={busy}
                    onClick={() => openForm(row)}
                    className={iconClass}>
                    <SquarePen size={18} />
                  </button>
                  <button
                    type="button"
                    title={
                      row.usageCount
                        ? '사용 중인 항목은 삭제할 수 없습니다'
                        : '삭제'
                    }
                    aria-label={`${row.name} 삭제`}
                    disabled={busy || row.usageCount > 0}
                    onClick={() => {
                      if (window.confirm(`'${row.name}'을(를) 삭제할까요?`)) {
                        setMessage('');
                        remove.mutate(row);
                      }
                    }}
                    className={iconClass}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!visible.length && (
            <p className="py-8 text-center text-amber-800">
              검색 결과가 없습니다.
            </p>
          )}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="이전 페이지"
              title="이전 페이지"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className={iconClass}>
              <ChevronLeft size={18} />
            </button>
            <span>
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="다음 페이지"
              title="다음 페이지"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
              className={iconClass}>
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
      {showForm && (
        <Modal
          title={`${isParish ? '본당' : '분류코드'} ${editing ? '수정' : '추가'}`}
          onClose={() => {
            if (!save.isPending) setShowForm(false);
          }}>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) save.mutate();
            }}>
            <fieldset disabled={save.isPending} className="space-y-4">
              {!isParish && (
                <label className="block space-y-2 text-amber-950">
                  <span>분류코드</span>
                  <input
                    required
                    pattern="[0-9]{3}"
                    maxLength={3}
                    inputMode="numeric"
                    disabled={!!editing?.usageCount}
                    value={form.code}
                    onChange={(event) =>
                      setForm({ ...form, code: event.target.value })
                    }
                    className={inputClass}
                  />
                  {editing?.usageCount ? (
                    <span className="block text-sm">
                      도서가 사용 중인 코드 번호는 변경할 수 없습니다.
                    </span>
                  ) : null}
                </label>
              )}
              <label className="block space-y-2 text-amber-950">
                <span>{isParish ? '본당명' : '분류명'}</span>
                <input
                  required
                  maxLength={isParish ? 50 : 100}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              {isParish ? (
                <label className="flex items-center gap-3 text-amber-950">
                  <input
                    type="checkbox"
                    checked={form.approved}
                    onChange={(event) =>
                      setForm({ ...form, approved: event.target.checked })
                    }
                    className="h-5 w-5 accent-red-900"
                  />
                  승인 완료
                </label>
              ) : (
                <>
                  <label className="block space-y-2 text-amber-950">
                    <span>대분류코드</span>
                    <input
                      required
                      list="category-groups"
                      pattern="[0-9]{3}"
                      maxLength={3}
                      inputMode="numeric"
                      value={form.mainCode}
                      onChange={(event) => {
                        const code = event.target.value;
                        setForm({
                          ...form,
                          mainCode: code,
                          mainLabel: groups.get(code) ?? '',
                        });
                      }}
                      className={inputClass}
                    />
                    <datalist id="category-groups">
                      {[...groups].map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label className="block space-y-2 text-amber-950">
                    <span>대분류명</span>
                    <input
                      required
                      maxLength={100}
                      readOnly={groups.has(form.mainCode)}
                      value={form.mainLabel}
                      onChange={(event) =>
                        setForm({ ...form, mainLabel: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                </>
              )}
            </fieldset>
            {save.error && (
              <p role="alert" className="text-red-700">
                {save.error.message}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => setShowForm(false)}
                className="rounded border border-amber-900/25 px-4 py-2 text-amber-950">
                취소
              </button>
              <button
                disabled={busy}
                className="rounded bg-red-900 px-5 py-2 text-white disabled:opacity-50">
                {save.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
