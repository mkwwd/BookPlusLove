import { createRouteClient } from './route';
import { supabaseServer } from './server';

export async function requireAdmin() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      email: null,
      error: Response.json({ error: '로그인이 필요합니다.' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .ilike('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return {
      email: user.email,
      error: Response.json(
        { error: '관리자만 이용할 수 있습니다.' },
        { status: 403 },
      ),
    };
  }

  return { email: user.email, error: null };
}
