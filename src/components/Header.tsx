import HeaderBar from '@/components/HeaderBar';
import HeaderBrand from '@/components/HeaderBrand';
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
      <div className="mx-auto max-w-screen-2xl px-4 pb-3 sm:px-6 lg:px-6">
        <div className="flex items-start justify-between">
          <HeaderBrand />
          <HeaderTopBar isLoggedIn={!!user} isAdmin={isAdmin} />
        </div>
      </div>
    </HeaderBar>
  );
}
