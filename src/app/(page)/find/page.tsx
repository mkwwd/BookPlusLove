'use client';

import { Suspense, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import FindIdForm from './components/FindIdForm';
import FindPasswordForm from './components/FindPasswordForm';

function FindTabs() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'password' ? 'password' : 'id';
  const [activeTab, setActiveTab] = useState<'id' | 'password'>(initialTab);

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-8 flex">
            <button
              type="button"
              onClick={() => setActiveTab('id')}
              className={`flex-1 border-b-2 pb-3 text-center font-serif text-xl ${
                activeTab === 'id'
                  ? 'border-red-900 text-amber-950'
                  : 'border-amber-900/20 text-amber-900/50'
              }`}>
              아이디 찾기
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 border-b-2 pb-3 text-center font-serif text-xl ${
                activeTab === 'password'
                  ? 'border-red-900 text-amber-950'
                  : 'border-amber-900/20 text-amber-900/50'
              }`}>
              비밀번호 찾기
            </button>
          </div>

          {activeTab === 'id' ? <FindIdForm /> : <FindPasswordForm />}

          <div className="mt-6 text-center text-base text-amber-800">
            <Link
              href="/login"
              className="hover:text-amber-950 hover:underline">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FindPage() {
  return (
    <Suspense fallback={null}>
      <FindTabs />
    </Suspense>
  );
}
