import { requireAdmin } from '@/utils/supabase/admin';
import { supabaseServer } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin(
    '관리자만 반납 처리할 수 있습니다.',
  );
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const loanId = Number(body?.loanId);

  if (!Number.isInteger(loanId) || loanId < 0) {
    return Response.json(
      { error: '대출 정보가 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const { data: loan, error: fetchError } = await supabaseServer
    .from('loans')
    .select('id, book_copy_id, returned_at')
    .eq('id', loanId)
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
  if (loan.returned_at) {
    return Response.json({ error: '이미 반납된 대출입니다.' }, { status: 409 });
  }

  const { error: returnError } = await supabaseServer
    .from('loans')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', loanId)
    .is('returned_at', null);

  if (returnError) {
    return Response.json({ error: returnError.message }, { status: 500 });
  }

  const { error: statusError } = await supabaseServer
    .from('book_copies')
    .update({ status: '대여가능' })
    .eq('id', loan.book_copy_id);

  if (statusError) {
    return Response.json(
      {
        error: `반납은 처리됐지만 도서 상태 갱신에 실패했습니다: ${statusError.message}`,
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
