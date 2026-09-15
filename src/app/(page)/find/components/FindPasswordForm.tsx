'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import EmailFields, { inputClass } from '@/components/EmailFields';

export default function FindPasswordForm() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [emailId, setEmailId] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const email = `${emailId}@${emailDomain}`;

  const {
    mutate: sendResetEmail,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users/verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, email }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? '확인에 실패했습니다.');
      }
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          !userId.trim() ||
          !name.trim() ||
          !emailId.trim() ||
          !emailDomain.trim()
        )
          return;
        sendResetEmail();
      }}>
      <div>
        <label className="mb-2 block text-base font-medium text-amber-950">
          아이디
        </label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="아이디를 입력해주세요"
          className={inputClass}
        />
      </div>

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

      {isSuccess && (
        <p className="text-center text-base text-amber-950">
          입력하신 이메일로 재설정 링크를 보냈습니다.
        </p>
      )}
      {error && (
        <p className="text-center text-base text-red-600">{error.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
        {isPending ? '전송 중...' : '재설정 링크 보내기'}
      </button>
    </form>
  );
}
