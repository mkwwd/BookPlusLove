'use client';

import { useRouter } from 'next/navigation';

import MemberRegisterForm from '@/components/MemberRegisterForm';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-8 text-center">
            <h3 className="mb-2 font-serif text-3xl text-amber-950">
              회원가입
            </h3>
          </div>

          <MemberRegisterForm onSuccess={() => router.push('/login')} />
        </div>
      </div>
    </div>
  );
}
