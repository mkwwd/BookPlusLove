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
    console.error('Parish registration failed', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    if (error.code === '23505') {
      return Response.json(
        { error: '이미 등록된 본당입니다.' },
        { status: 409 },
      );
    }
    if (error.code === '42501') {
      return Response.json(
        {
          error:
            '본당 등록 권한이 설정되지 않았습니다. 관리자에게 문의해주세요.',
        },
        { status: 500 },
      );
    }
    return Response.json({ error: '등록에 실패했습니다.' }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
