'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SquarePen, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { formatNoticeDate } from '@/lib/notices';

interface Notice {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
}

interface NoticeManagerProps {
  hideWhenForbidden?: boolean;
  showHeading?: boolean;
}

const emptyForm = {
  title: '',
  content: '',
  isPublished: true,
  publishedAt: new Date().toISOString().slice(0, 10),
};

function toDateInputValue(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function NoticeManager({
  hideWhenForbidden = false,
  showHeading = false,
}: NoticeManagerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notices');
      const body = await res.json();
      if (hideWhenForbidden && (res.status === 401 || res.status === 403)) {
        return null;
      }
      if (!res.ok) {
        throw new Error(body.error ?? '공지사항을 불러오지 못했습니다.');
      }
      return body.notices as Notice[];
    },
  });
  const notices = data ?? [];

  const resetForm = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      publishedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const saveNotice = useMutation({
    mutationFn: async () => {
      const url = editing
        ? `/api/admin/notices/${editing.id}`
        : '/api/admin/notices';
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          publishedAt: new Date(form.publishedAt).toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? '공지사항 저장에 실패했습니다.');
      }
    },
    onSuccess: () => {
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      router.refresh();
    },
  });

  const deleteNotice = useMutation({
    mutationFn: async (noticeId: number) => {
      const res = await fetch(`/api/admin/notices/${noticeId}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? '공지사항 삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      router.refresh();
    },
  });

  const startEdit = (notice: Notice) => {
    setEditing(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      isPublished: notice.isPublished,
      publishedAt: toDateInputValue(notice.publishedAt),
    });
  };

  const handleDelete = (notice: Notice) => {
    if (!window.confirm(`"${notice.title}" 공지사항을 삭제할까요?`)) return;
    deleteNotice.mutate(notice.id);
  };

  if (hideWhenForbidden && isLoading) {
    return null;
  }

  if (hideWhenForbidden && data === null) {
    return null;
  }

  return (
    <div
      className={
        showHeading
          ? 'mt-10 space-y-6 border-t border-amber-900/15 pt-8'
          : 'space-y-6'
      }>
      {showHeading && (
        <div>
          <h2 className="font-serif text-2xl font-bold text-amber-950">
            공지사항 관리
          </h2>
          <p className="mt-2 text-base text-amber-900/70">
            관리자 계정에서는 이 페이지에서 바로 공지사항을 등록하고 수정할 수
            있습니다.
          </p>
        </div>
      )}

      <form
        className="space-y-4 rounded-lg border border-amber-900/20 bg-white/40 p-5 shadow-sm backdrop-blur-sm"
        onSubmit={(e) => {
          e.preventDefault();
          saveNotice.mutate();
        }}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-2xl text-amber-950">
            {editing ? '공지사항 수정' : '공지사항 등록'}
          </h3>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 rounded border border-amber-900/20 px-3 py-2 text-sm text-amber-900 hover:bg-amber-50">
              <X className="h-4 w-4" />
              취소
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <div>
            <label className="mb-1.5 block text-base font-medium text-amber-950">
              제목
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border border-amber-900/20 bg-white/60 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-base font-medium text-amber-950">
              게시일
            </label>
            <input
              type="date"
              value={form.publishedAt}
              onChange={(e) =>
                setForm({ ...form, publishedAt: e.target.value })
              }
              className="w-full rounded border border-amber-900/20 bg-white/60 px-4 py-2.5 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-base font-medium text-amber-950">
            내용
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={7}
            className="w-full rounded border border-amber-900/20 bg-white/60 px-4 py-3 text-base focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-base text-amber-950">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm({ ...form, isPublished: e.target.checked })
              }
              className="h-4 w-4 accent-red-900"
            />
            공개
          </label>

          {saveNotice.error && (
            <p className="text-sm text-red-600">{saveNotice.error.message}</p>
          )}

          <button
            type="submit"
            disabled={saveNotice.isPending}
            className="flex items-center gap-1.5 rounded bg-red-900 px-5 py-2.5 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {saveNotice.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-amber-900/20 bg-white/40 shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-[1fr_96px_120px_92px] border-b border-amber-900/20 bg-amber-50/70 px-5 py-3 text-base font-medium text-amber-800">
          <span>제목</span>
          <span className="text-center">상태</span>
          <span className="text-center">게시일</span>
          <span className="text-right">관리</span>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-center text-amber-900/60">
            불러오는 중...
          </p>
        ) : notices.length === 0 ? (
          <p className="px-5 py-8 text-center text-amber-900/60">
            등록된 공지사항이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-amber-900/10">
            {notices.map((notice) => (
              <li
                key={notice.id}
                className="grid grid-cols-[1fr_96px_120px_92px] items-center px-5 py-4 text-base">
                <div className="min-w-0">
                  <p className="truncate font-medium text-amber-950">
                    {notice.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-amber-900/65">
                    {notice.content}
                  </p>
                </div>
                <span
                  className={`justify-self-center rounded px-2.5 py-1 text-sm font-medium ${
                    notice.isPublished
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                  {notice.isPublished ? '공개' : '비공개'}
                </span>
                <time className="text-center text-amber-800">
                  {formatNoticeDate(notice.publishedAt)}
                </time>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(notice)}
                    aria-label="공지사항 수정"
                    className="rounded border border-amber-900/20 p-2 text-amber-900 hover:bg-amber-50">
                    <SquarePen className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(notice)}
                    aria-label="공지사항 삭제"
                    className="rounded border border-red-900/20 p-2 text-red-900 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
