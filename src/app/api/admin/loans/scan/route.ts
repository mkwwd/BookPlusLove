import { isValidRegNo } from '@/lib/regNo';
import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET(request: Request) {
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
      { error: '관리자만 조회할 수 있습니다.' },
      { status: 403 },
    );
  }

  const regNo = new URL(request.url).searchParams.get('regNo')?.trim() ?? '';
  if (!isValidRegNo(regNo)) {
    return Response.json(
      { error: '등록번호 형식이 올바르지 않습니다 (예: MB123456).' },
      { status: 400 },
    );
  }

  const { data: copy, error: copyError } = await supabaseServer
    .from('book_copies')
    .select('id, reg_no, status, book_id, books(id, title, author, cover_url)')
    .eq('reg_no', regNo)
    .maybeSingle();

  if (copyError) {
    return Response.json({ error: copyError.message }, { status: 500 });
  }

  if (!copy) {
    return Response.json({ status: 'not_found', regNo });
  }

  const book = Array.isArray(copy.books) ? copy.books[0] : copy.books;
  const copyInfo = {
    id: copy.id,
    regNo: copy.reg_no,
    status: copy.status as string,
    bookId: copy.book_id,
  };

  if (copy.status === '대여가능') {
    return Response.json({ status: 'available', copy: copyInfo, book });
  }

  if (copy.status === '대여중') {
    const { data: loan, error: loanError } = await supabaseServer
      .from('loans')
      .select('id, loaned_at, due_at, users(id, name, phone)')
      .eq('book_copy_id', copy.id)
      .is('returned_at', null)
      .maybeSingle();

    if (loanError) {
      return Response.json({ error: loanError.message }, { status: 500 });
    }
    if (!loan) {
      return Response.json(
        {
          error:
            '이 책은 대여중 상태인데 진행 중인 대출 기록을 찾을 수 없습니다. 관리자에게 문의하세요.',
        },
        { status: 500 },
      );
    }

    const borrower = Array.isArray(loan.users) ? loan.users[0] : loan.users;
    return Response.json({
      status: 'on_loan',
      copy: copyInfo,
      book,
      loan: { id: loan.id, loanedAt: loan.loaned_at, dueAt: loan.due_at },
      borrower,
    });
  }

  return Response.json({ status: 'unavailable', copy: copyInfo, book });
}
