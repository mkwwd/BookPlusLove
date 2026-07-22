import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .eq('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return Response.json(
      { error: '관리자만 검색할 수 있습니다.' },
      { status: 403 },
    );
  }

  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q) {
    return Response.json({ users: [] });
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select('id, name, phone')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(10);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ users: data });
}
