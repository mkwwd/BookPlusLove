import { normalizeNoticeInput } from '@/lib/notices';
import { requireAdmin } from '@/utils/supabase/admin';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { data, error } = await supabaseServer
    .from('notices')
    .select(
      'id, title, content, is_published, is_pinned, published_at, created_at',
    )
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
      isPinned: notice.is_pinned,
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
      is_pinned: value.isPinned ?? false,
      published_at: value.publishedAt,
    })
    .select('id')
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}
