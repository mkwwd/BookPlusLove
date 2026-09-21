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

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { data, error } = await supabaseServer
    .from('notices')
    .select('id, title, content, is_published, published_at, created_at')
    .order('published_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    notices: (data ?? []).map((notice) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      isPublished: notice.is_published,
      publishedAt: notice.published_at,
      createdAt: notice.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const parsed = normalizeNoticeInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { value } = parsed;
  const { data, error } = await supabaseServer
    .from('notices')
    .insert({
      title: value.title,
      content: value.content,
      is_published: value.isPublished,
      published_at: value.publishedAt,
    })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}
