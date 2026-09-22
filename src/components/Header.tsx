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
          <HeaderTopBar isLoggedIn={!!user} isAdmin={isAdmin} />
        </div>
      </div>
    </HeaderBar>
  );
}
