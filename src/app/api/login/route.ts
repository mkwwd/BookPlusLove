import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!userId || !password) {
    return Response.json(
      { error: '아이디와 비밀번호를 입력해주세요.' },
      { status: 400 },
    );
  }

  const { data: userRow, error: lookupError } = await supabaseServer
    .from('users')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupError || !userRow) {
    return Response.json(
      { error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
      { status: 401 },
    );
  }

  const supabase = await createRouteClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userRow.email,
    password,
  });

  if (signInError) {
    return Response.json(
      { error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
      { status: 401 },
    );
  }

  return Response.json({ success: true });
}
