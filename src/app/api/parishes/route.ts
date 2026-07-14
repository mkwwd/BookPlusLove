import { supabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parishname =
    typeof body?.parishname === 'string' ? body.parishname.trim() : '';

  if (!parishname || parishname.length > 50) {
    return Response.json(
      { error: '본당명을 1~50자로 입력해주세요.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from('parishes')
    .insert({ parishname, is_verified: false })
    .select('id, parishname')
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json(
        { error: '이미 등록된 본당입니다.' },
        { status: 409 },
      );
    }
    return Response.json({ error: '등록에 실패했습니다.' }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
