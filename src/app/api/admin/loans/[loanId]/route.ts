import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ loanId: string }> },
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
    .eq('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return Response.json(
      { error: '관리자만 수정할 수 있습니다.' },
      { status: 403 },
    );
  }

  const { loanId } = await params;
  const loanIdNum = Number(loanId);
  if (!Number.isInteger(loanIdNum) || loanIdNum < 0) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const dueAt = typeof body?.dueAt === 'string' ? body.dueAt.trim() : '';

  if (!DATE_REGEX.test(dueAt)) {
    return Response.json(
      { error: '반납예정일 형식이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabaseServer
    .from('loans')
    .update({ due_at: dueAt })
    .eq('id', loanIdNum)
    .select('id')
    .maybeSingle();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return Response.json(
      { error: '대출 기록을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}
