import { isValidRegNo } from '@/lib/regNo';
import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

const VALID_STATUSES = ['대여가능', '대여중', '분실', '폐기'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ copyId: string }> },
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
      { error: '관리자만 도서를 수정할 수 있습니다.' },
      { status: 403 },
    );
  }

  const { copyId } = await params;
  const copyIdNum = Number(copyId);
  if (!Number.isFinite(copyIdNum) || copyIdNum <= 0) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { data: existingCopy } = await supabaseServer
    .from('book_copies')
    .select('id, book_id')
    .eq('id', copyIdNum)
    .maybeSingle();

  if (!existingCopy) {
    return Response.json(
      { error: '해당 도서를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const regNo = typeof body?.regNo === 'string' ? body.regNo.trim() : '';
  const status = typeof body?.status === 'string' ? body.status : '';

  if (!title) {
    return Response.json({ error: '제목은 필수입니다.' }, { status: 400 });
  }
  if (!isValidRegNo(regNo)) {
    return Response.json(
      { error: '등록번호가 MB+숫자 6자리 형식이 아닙니다.' },
      { status: 400 },
    );
  }
  if (!VALID_STATUSES.includes(status)) {
    return Response.json(
      { error: '상태 값이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const { error: updateBookError } = await supabaseServer
    .from('books')
    .update({
      title,
      author:
        typeof body?.author === 'string' ? body.author.trim() || null : null,
      publisher:
        typeof body?.publisher === 'string'
          ? body.publisher.trim() || null
          : null,
      page: typeof body?.page === 'string' ? body.page.trim() || null : null,
      price: typeof body?.price === 'string' ? body.price.trim() || null : null,
      pub_date:
        typeof body?.pubDate === 'string' ? body.pubDate.trim() || null : null,
      author_code:
        typeof body?.authorCode === 'string'
          ? body.authorCode.trim() || null
          : null,
      category_code:
        typeof body?.category === 'string' ? body.category || null : null,
    })
    .eq('id', existingCopy.book_id);

  if (updateBookError) {
    return Response.json({ error: updateBookError.message }, { status: 500 });
  }

  const { error: updateCopyError } = await supabaseServer
    .from('book_copies')
    .update({
      reg_no: regNo,
      status,
      donor_name:
        typeof body?.donorName === 'string'
          ? body.donorName.trim() || null
          : null,
      donor_user_id:
        typeof body?.donorUserId === 'number' ? body.donorUserId : null,
    })
    .eq('id', copyIdNum);

  if (updateCopyError) {
    return Response.json(
      {
        error:
          updateCopyError.code === '23505'
            ? '이미 사용 중인 등록번호입니다.'
            : updateCopyError.message,
      },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
