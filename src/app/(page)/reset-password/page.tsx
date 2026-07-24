'use client';

import { useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { supabase } from '@/utils/supabase/client';

const SPECIAL_CHAR_REGEX = /[^a-zA-Z0-9]/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<
    'checking' | 'ready' | 'invalid'
  >('checking');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    let recoveryDetected = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryDetected = true;
        setSessionState('ready');
      }
    });

    // Only a fresh recovery link fires PASSWORD_RECOVERY; a plain revisit
    // (e.g. navigating back to this URL later) won't, so treat that as invalid.
    const timeout = setTimeout(() => {
      if (!recoveryDetected) setSessionState('invalid');
    }, 2000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const {
    mutate: updatePassword,
    isPending,
    error: submitError,
  } = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error('비밀번호 변경에 실패했습니다.');
      await supabase.auth.signOut();
    },
    onSuccess: () => {
      router.push('/login');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8 || !SPECIAL_CHAR_REGEX.test(password)) {
      setValidationError('비밀번호는 8자 이상, 특수문자를 포함해야 합니다');
      return;
    }
    if (password !== passwordConfirm) {
      setValidationError('비밀번호가 일치하지 않습니다');
      return;
    }

    setValidationError(undefined);
    updatePassword();
  };

  if (sessionState === 'checking') {
    return (
      <div className="page-bg min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 text-center shadow-sm backdrop-blur-sm sm:p-8">
            <p className="text-lg text-gray-900">확인 중입니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sessionState === 'invalid') {
    return (
      <div className="page-bg min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 text-center shadow-sm backdrop-blur-sm sm:p-8">
            <p className="text-lg text-gray-900">
              유효하지 않거나 만료된 링크입니다.
            </p>
            <Link
              href="/find?tab=password"
              className="mt-4 inline-block text-base text-gray-700 hover:text-gray-900 hover:underline">
              비밀번호 찾기로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-8 text-center">
            <h3 className="mb-2 font-serif text-3xl text-gray-900">
              비밀번호 재설정
            </h3>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block text-base font-medium text-gray-900">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상, 특수문자 포함"
                  className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3 right-3 cursor-pointer text-gray-900 hover:text-red-800">
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-base font-medium text-gray-900">
                새 비밀번호 확인
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력해주세요"
                className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
              />
            </div>

            {validationError && (
              <p className="text-center text-base text-red-600">
                {validationError}
              </p>
            )}
            {submitError && (
              <p className="text-center text-base text-red-600">
                {submitError.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
              {isPending ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
