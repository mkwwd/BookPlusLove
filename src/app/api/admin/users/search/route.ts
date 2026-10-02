import { requireAdmin } from '@/utils/supabase/admin';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { error: authError } =
    await requireAdmin('관리자만 검색할 수 있습니다.');
  if (authError) return authError;

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
