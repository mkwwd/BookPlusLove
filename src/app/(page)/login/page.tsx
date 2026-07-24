'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page1Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '로그인에 실패했습니다.');
    },
    onSuccess: () => {
      // Full navigation so the root layout (Header) re-reads the session
      // cookie on the server instead of reusing the pre-login client render.
      window.location.href = '/';
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password) return;
    login();
  };

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-8 text-center">
            <div className="my-10 flex justify-center">
              <div className="relative h-20 w-20">
                <Image
                  src="/image/logo.png"
                  alt="로고"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>
            <div className="mb-2 font-serif text-4xl text-amber-950">
              책더하기사랑작은도서관
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block text-base font-medium text-amber-950">
                아이디
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디를 입력해주세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-base font-medium text-amber-950">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 right-3 cursor-pointer text-amber-950 hover:text-red-800">
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-center text-base text-red-600">
                {error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
              {isPending ? '로그인 중...' : '로그인'}
            </button>

            <div className="flex justify-center gap-4 text-base text-amber-800">
              <Link
                href="/register"
                className="hover:text-amber-950 hover:underline">
                회원가입
              </Link>
              <span>|</span>
              <Link
                href="/find?tab=id"
                className="hover:text-amber-950 hover:underline">
                아이디 찾기
              </Link>
              <span>|</span>
              <Link
                href="/find?tab=password"
                className="hover:text-amber-950 hover:underline">
                비밀번호 찾기
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
