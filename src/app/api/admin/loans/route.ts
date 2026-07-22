import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

async function requireAdmin() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      error: Response.json({ error: '로그인이 필요합니다.' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .eq('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return {
      error: Response.json(
        { error: '관리자만 이용할 수 있습니다.' },
        { status: 403 },
      ),
    };
  }

  return { error: null };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: listError } = await supabaseServer
    .from('loans')
    .select(
      'id, loaned_at, due_at, returned_at, book_copies(reg_no, books(title)), users(name)',
    )
    .order('loaned_at', { ascending: false })
    .limit(200);

  if (listError) {
    return Response.json({ error: listError.message }, { status: 500 });
  }

  const loans = (data ?? []).map((row) => {
    const copy = Array.isArray(row.book_copies)
      ? row.book_copies[0]
      : row.book_copies;
    const book = copy
      ? Array.isArray(copy.books)
        ? copy.books[0]
        : copy.books
      : null;
    const borrower = Array.isArray(row.users) ? row.users[0] : row.users;

    return {
      id: row.id,
      title: book?.title ?? '(알 수 없음)',
      regNo: copy?.reg_no ?? '-',
      borrowerName: borrower?.name ?? '(알 수 없음)',
      loanedAt: row.loaned_at,
      dueAt: row.due_at,
      returnedAt: row.returned_at,
    };
  });

  return Response.json({ loans });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const bookCopyId = Number(body?.bookCopyId);
  const userId = Number(body?.userId);
  const dueAt = typeof body?.dueAt === 'string' ? body.dueAt.trim() : '';

  if (!Number.isInteger(bookCopyId) || bookCopyId < 0) {
    return Response.json(
      { error: '도서 정보가 올바르지 않습니다.' },
      { status: 400 },
    );
  }
  if (body?.userId == null || !Number.isInteger(userId) || userId < 0) {
    return Response.json({ error: '대출자를 선택해주세요.' }, { status: 400 });
  }
  if (!DATE_REGEX.test(dueAt)) {
    return Response.json(
      { error: '반납예정일 형식이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  // 낙관적 동시성 체크: 여전히 '대여가능'인 경우에만 '대여중'으로 바꾼다.
  // 0건 업데이트되면 그 사이 다른 요청이 먼저 처리된 것.
  const { data: updated, error: updateError } = await supabaseServer
    .from('book_copies')
    .update({ status: '대여중' })
    .eq('id', bookCopyId)
    .eq('status', '대여가능')
    .select('id')
    .maybeSingle();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return Response.json(
      { error: '이미 대출 중이거나 대출할 수 없는 책입니다.' },
      { status: 409 },
    );
  }

  const { data: loan, error: insertError } = await supabaseServer
    .from('loans')
    .insert({ book_copy_id: bookCopyId, user_id: userId, due_at: dueAt })
    .select('id, loaned_at, due_at')
    .single();

  if (insertError) {
    // 대출 기록 생성에 실패했으면 상태를 되돌린다.
    await supabaseServer
      .from('book_copies')
      .update({ status: '대여가능' })
      .eq('id', bookCopyId);

    return Response.json(
      { error: `대출 처리에 실패했습니다: ${insertError.message}` },
      { status: 500 },
    );
  }

  return Response.json({ loan }, { status: 201 });
}
