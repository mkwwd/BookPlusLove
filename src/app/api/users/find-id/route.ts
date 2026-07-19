import { supabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!name || !email) {
    return Response.json(
      { error: '이름과 이메일을 입력해주세요.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select('user_id')
    .eq('name', name)
    .eq('email', email)
    .maybeSingle();

  if (error || !data) {
    return Response.json(
      { error: '일치하는 회원 정보가 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ userId: data.user_id });
}
