import { normalizeNoticeInput } from '@/lib/notices';
import { createRouteClient } from '@/utils/supabase/route';
import { supabaseServer } from '@/utils/supabase/server';

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
    .ilike('email', user.email)
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

function parseNoticeId(value: string) {
  const noticeId = Number(value);
  return Number.isInteger(noticeId) && noticeId > 0 ? noticeId : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noticeId: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { noticeId } = await params;
  const id = parseNoticeId(noticeId);
  if (!id) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const parsed = normalizeNoticeInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { value } = parsed;
  const { data, error } = await supabaseServer
    .from('notices')
    .update({
      title: value.title,
      content: value.content,
      is_published: value.isPublished,
      published_at: value.publishedAt,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json(
      { error: '해당 공지사항을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noticeId: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { noticeId } = await params;
  const id = parseNoticeId(noticeId);
  if (!id) {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('notices')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json(
      { error: '해당 공지사항을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}
