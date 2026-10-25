'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NoticeDeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/notices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? '공지사항 삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      router.push('/notices');
      router.refresh();
    },
  });
  return (
    <div>
      <button
        type="button"
        disabled={remove.isPending}
        onClick={() => {
          if (window.confirm('이 공지사항을 삭제할까요?')) remove.mutate();
        }}
        className="flex items-center gap-2 rounded border border-red-900/30 px-5 py-3 text-red-900 disabled:opacity-50">
        <Trash2 className="h-5 w-5" />
        {remove.isPending ? '삭제 중...' : '삭제'}
      </button>
      {remove.error && (
        <p role="alert" className="mt-2 text-red-700">
          {remove.error.message}
        </p>
      )}
    </div>
  );
}
