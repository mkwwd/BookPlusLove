import { supabaseServer } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') ?? '';

  if (!userId || userId.length < 4 || userId.length > 12) {
    return Response.json(
      { error: '아이디는 4~12자로 입력해주세요.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return Response.json(
      { error: '중복 확인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  return Response.json({ available: !data });
}
