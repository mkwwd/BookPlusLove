import Image from 'next/image';
import Link from 'next/link';

import HeaderBar from '@/components/HeaderBar';
import HeaderTopBar from '@/components/HeaderTopBar';
import { supabaseServer } from '@/utils/supabase/server';
import { createSessionClient } from '@/utils/supabase/session';

export default async function Header() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.email) {
    const { data } = await supabaseServer
      .from('users')
      .select('role')
      .eq('email', user.email)
      .maybeSingle();
    isAdmin = data?.role === 'ADMIN';
  }

  return (
    <HeaderBar>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-6">
        <div className="flex items-center justify-between py-2 text-sm text-amber-950/70">
          <span>광주가톨릭평생교육원</span>
          <HeaderTopBar isLoggedIn={!!user} isAdmin={isAdmin} />
        </div>

        <div className="flex items-center justify-between pb-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/image/logo.png"
                alt="로고"
                fill
                priority
                className="object-contain"
              />
            </div>
            <h1 className="font-serif text-2xl text-amber-900 sm:text-3xl">
              책더하기사랑작은도서관
            </h1>
          </Link>
        </div>
      </div>
    </HeaderBar>
  );
}
