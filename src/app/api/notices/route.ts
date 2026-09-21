import { supabaseServer } from '@/utils/supabase/server';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('notices')
    .select('id, title, content, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    notices: (data ?? []).map((notice) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      publishedAt: notice.published_at,
    })),
  });
}
