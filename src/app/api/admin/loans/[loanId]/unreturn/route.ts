import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

export async function POST(
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
      { error: '관리자만 되돌릴 수 있습니다.' },
      { status: 403 },
    );
  }

  const { loanId } = await params;
  const loanIdNum = Number(loanId);
  if (!Number.isInteger(loanIdNum) || loanIdNum < 0) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { data: loan, error: fetchError } = await supabaseServer
    .from('loans')
    .select('id, book_copy_id, returned_at')
    .eq('id', loanIdNum)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!loan) {
    return Response.json(
      { error: '대출 기록을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }
  if (!loan.returned_at) {
    return Response.json({ error: '이미 대출중인 건입니다.' }, { status: 409 });
  }

  const { error: loanError } = await supabaseServer
    .from('loans')
    .update({ returned_at: null })
    .eq('id', loanIdNum);

  if (loanError) {
    return Response.json({ error: loanError.message }, { status: 500 });
  }

  const { error: statusError } = await supabaseServer
    .from('book_copies')
    .update({ status: '대여중' })
    .eq('id', loan.book_copy_id);

  if (statusError) {
    return Response.json(
      {
        error: `대출중으로 되돌렸지만 도서 상태 갱신에 실패했습니다: ${statusError.message}`,
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
