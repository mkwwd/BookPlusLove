'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import EmailFields, { inputClass } from '@/components/EmailFields';

export default function FindIdForm() {
  const [name, setName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const email = `${emailId}@${emailDomain}`;

  const {
    mutate: findUserId,
    data: foundUserId,
    error,
    isPending,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? '조회에 실패했습니다.');
      return body.userId as string;
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !emailId.trim() || !emailDomain.trim()) return;
        findUserId();
      }}>
      <div>
        <label className="mb-2 block text-base font-medium text-amber-950">
          이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력해주세요"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-2 block text-base font-medium text-amber-950">
          이메일
        </label>
        <EmailFields
          emailId={emailId}
          emailDomain={emailDomain}
          onEmailIdChange={setEmailId}
          onEmailDomainChange={setEmailDomain}
        />
      </div>

      {foundUserId && (
        <p className="text-center text-base text-amber-950">
          회원님의 아이디는 <span className="font-medium">{foundUserId}</span>{' '}
          입니다
        </p>
      )}
      {error && (
        <p className="text-center text-base text-red-600">{error.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
        {isPending ? '조회 중...' : '아이디 찾기'}
      </button>
    </form>
  );
}
