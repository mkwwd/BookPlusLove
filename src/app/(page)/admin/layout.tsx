import { redirect } from 'next/navigation';

import { supabaseServer } from '@/utils/supabase/server';
import { createSessionClient } from '@/utils/supabase/session';

import AdminNav from './AdminNav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const { data } = await supabaseServer
    .from('users')
    .select('role')
    .eq('email', user.email)
    .maybeSingle();

  if (data?.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="page-bg min-h-screen">
      <AdminNav />
      <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  );
}
