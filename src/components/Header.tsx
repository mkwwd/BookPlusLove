import Link from 'next/link';
import { connection } from 'next/server';

import HeaderBar from '@/components/HeaderBar';
import HeaderBrand from '@/components/HeaderBrand';
import HeaderTopBar from '@/components/HeaderTopBar';
import { supabaseServer } from '@/utils/supabase/server';
import { createSessionClient } from '@/utils/supabase/session';

export default async function Header() {
  await connection();

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.email) {
    const { data } = await supabaseServer
      .from('users')
      .select('role')
      .ilike('email', user.email)
      .maybeSingle();
    isAdmin = data?.role === 'ADMIN';
  }

  return (
    <HeaderBar>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
          <HeaderBrand />
          <nav className="home-hero-nav order-3 flex w-full items-center gap-4 pb-4 font-serif text-lg font-medium text-amber-900 sm:order-none sm:w-auto sm:self-stretch sm:pb-0">
            <a
              href="https://www.kccei.com/fro_end/html/main/index.php"
              target="_blank"
              rel="noreferrer"
              className="transition hover:font-black hover:text-red-900 hover:underline hover:underline-offset-4">
              광주가톨릭평생교육원
            </a>
            <Link
              href="/notices"
              className="transition hover:font-black hover:text-red-900 hover:underline hover:underline-offset-4">
              공지사항
            </Link>
          </nav>
          <HeaderTopBar isLoggedIn={!!user} isAdmin={isAdmin} />
        </div>
      </div>
    </HeaderBar>
  );
}
