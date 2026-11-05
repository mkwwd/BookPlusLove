import { parseCategoryGroup } from '@/lib/adminCatalog';
import { requireAdmin } from '@/utils/supabase/admin';
import { catalogError } from '@/utils/supabase/catalog';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const { data, error } = await supabaseServer
    .from('book_category_groups')
    // Reading all group fields also works before the additive color migration.
    .select('*, book_categories(count)')
    .order('code')
    .range(0, 999);
  if (error) return catalogError(error);
  return Response.json({
    items: data.map(({ book_categories, code, label, color }) => ({
      code,
      label,
      color,
      usageCount: book_categories[0]?.count ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const parsed = parseCategoryGroup(await request.json().catch(() => null));
  if (parsed.error)
    return Response.json({ error: parsed.error }, { status: 400 });
  const { data, error } = await supabaseServer
    .from('book_category_groups')
    .insert(parsed.value!)
    .select('code')
    .single();
  if (error) return catalogError(error);
  return Response.json(data, { status: 201 });
}
