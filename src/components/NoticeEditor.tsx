'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { NoticeInput } from '@/lib/notices';

export default function NoticeEditor({
  notice,
}: {
  notice?: NoticeInput & { id: number };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NoticeInput>(() => ({
    title: notice?.title ?? '',
    content: notice?.content ?? '',
    isPublished: notice?.isPublished ?? true,
    isPinned: notice?.isPinned ?? false,
    publishedAt: notice?.publishedAt ?? new Date().toISOString(),
  }));
  const cancelUrl = notice ? `/notices/${notice.id}` : '/notices';
  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        notice ? `/api/admin/notices/${notice.id}` : '/api/admin/notices',
        {
          method: notice ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      );
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? '공지사항 저장에 실패했습니다.');
      return notice?.id ?? body.id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      router.push(`/notices/${id}`);
      router.refresh();
    },
  });
  return (
    <main className="page-bg min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl text-amber-950">
        <h1 className="mb-8 border-b border-amber-900/20 pb-5 font-serif text-3xl">
          {notice ? '공지사항 수정' : '글 작성하기'}
        </h1>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!save.isPending) save.mutate();
          }}>
          <fieldset
            disabled={save.isPending}
            className="space-y-6 disabled:opacity-60">
            <label className="block text-lg">
              제목
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-2 block w-full rounded border border-amber-900/20 bg-white p-3"
              />
            </label>
            <label className="block text-lg">
              내용
              <textarea
                required
                rows={14}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-2 block w-full resize-y rounded border border-amber-900/20 bg-white p-3 leading-relaxed"
              />
            </label>
            <label className="flex items-center gap-3 text-lg">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm({ ...form, isPublished: e.target.checked })
                }
                className="h-5 w-5 accent-red-900"
              />
              공개
            </label>
          </fieldset>
          <label className="flex items-center gap-3 text-lg">
            <input
              type="checkbox"
              disabled={save.isPending}
              checked={form.isPinned ?? false}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              className="h-5 w-5 accent-red-900"
            />
            상단 고정
          </label>
          {save.error && (
            <p role="alert" className="text-red-700">
              {save.error.message}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-amber-900/20 pt-5">
            <Link
              href={cancelUrl}
              className="rounded border border-amber-900/20 px-5 py-3">
              취소
            </Link>
            <button
              disabled={save.isPending}
              type="submit"
              className="flex items-center gap-2 rounded bg-red-900 px-5 py-3 text-white hover:bg-red-800 disabled:opacity-50">
              <Save className="h-5 w-5" />
              {save.isPending
                ? '저장 중...'
                : notice
                  ? '수정 완료'
                  : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
