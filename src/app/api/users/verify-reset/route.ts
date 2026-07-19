import { supabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!userId || !name || !email) {
    return Response.json(
      { error: '아이디, 이름, 이메일을 모두 입력해주세요.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('email', email)
    .maybeSingle();

  if (error || !data) {
    return Response.json(
      { error: '일치하는 회원 정보가 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ verified: true });
}
