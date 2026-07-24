'use client';

import { useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';

import { supabase } from '@/utils/supabase/client';

export interface SelectedParish {
  id: number;
  name: string;
}

interface ParishSearchModalProps {
  onClose: () => void;
  onSelect: (parish: SelectedParish) => void;
}

export default function ParishSearchModal({
  onClose,
  onSelect,
}: ParishSearchModalProps) {
  const [keyword, setKeyword] = useState('');

  const { data: parishes = [], isLoading } = useQuery({
    queryKey: ['parishes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parishes')
        .select('id, parishname')
        .eq('is_verified', true)
        .order('parishname');

      if (error) throw error;
      return data.map((row) => ({
        id: row.id as number,
        name: row.parishname as string,
      }));
    },
  });

  const {
    mutate: registerParish,
    isPending: isRegistering,
    error: registerError,
  } = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/parishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parishname: name }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '등록에 실패했습니다.');
      return { id: body.id, name: body.parishname } as SelectedParish;
    },
    onSuccess: onSelect,
  });

  const trimmedKeyword = keyword.trim();
  const filtered = trimmedKeyword
    ? parishes.filter((parish) => parish.name.includes(trimmedKeyword))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-amber-900/20 px-5 py-4">
          <h2 className="font-serif text-xl text-amber-950">본당 검색</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-amber-600 hover:text-amber-950">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-amber-900/20 px-5 py-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-950" />
            <input
              type="text"
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="본당명을 입력해주세요"
              className="w-full rounded border border-amber-900/30 bg-white/50 py-2 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
            />
          </div>
        </div>

        <ul className="overflow-y-auto">
          {isLoading ? (
            <li className="px-5 py-6 text-center text-base text-amber-900/50">
              불러오는 중...
            </li>
          ) : !trimmedKeyword ? (
            <li className="px-5 py-6 text-center text-base text-amber-900/50">
              본당명을 검색해주세요
            </li>
          ) : filtered.length === 0 ? (
            <li className="flex flex-col items-center gap-3 px-5 py-6 text-center text-base">
              <span className="text-amber-950">검색 결과가 없습니다</span>
              <button
                type="button"
                disabled={isRegistering}
                onClick={() => registerParish(trimmedKeyword)}
                className="rounded bg-red-900 px-4 py-2 text-base font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
                {isRegistering
                  ? '등록 중...'
                  : `'${trimmedKeyword}'(으)로 직접 입력`}
              </button>
              {registerError && (
                <span className="text-sm text-red-600">
                  {registerError.message}
                </span>
              )}
            </li>
          ) : (
            filtered.map((parish) => (
              <li key={parish.id}>
                <button
                  type="button"
                  onClick={() => onSelect(parish)}
                  className="w-full px-5 py-3 text-left text-base text-amber-950 hover:bg-amber-50">
                  {parish.name}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
