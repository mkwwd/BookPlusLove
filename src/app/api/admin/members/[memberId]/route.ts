import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

const VALID_ROLES = ['USER', 'ADMIN'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
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
    .ilike('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return Response.json(
      { error: '관리자만 권한을 변경할 수 있습니다.' },
      { status: 403 },
    );
  }

  const { memberId } = await params;
  const memberIdNum = Number(memberId);
  if (!Number.isInteger(memberIdNum) || memberIdNum < 0) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const role = typeof body?.role === 'string' ? body.role : '';

  if (!VALID_ROLES.includes(role)) {
    return Response.json(
      { error: '권한 값이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabaseServer
    .from('users')
    .update({ role })
    .eq('id', memberIdNum)
    .select('id')
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return Response.json(
      { error: '해당 회원을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}
