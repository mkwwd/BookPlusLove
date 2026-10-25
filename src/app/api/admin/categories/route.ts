import { parseCategory } from '@/lib/adminCatalog';
import { requireAdmin } from '@/utils/supabase/admin';
import { catalogError, categoryGroupError } from '@/utils/supabase/catalog';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseServer
      .from('book_categories')
      .select('code, label, main_code, books(count)')
      .order('code')
      .range(offset, offset + 999);
    if (error) return catalogError(error);
    rows.push(
      ...data.map(({ books, ...category }) => ({
        ...category,
        usageCount: books[0]?.count ?? 0,
      })),
    );
    if (data.length < 1000) break;
  }
  return Response.json({ items: rows });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const parsed = parseCategory(await request.json().catch(() => null));
  if (parsed.error)
    return Response.json({ error: parsed.error }, { status: 400 });
  const value = parsed.value!;
  const groupError = await categoryGroupError(value.main_code);
  if (groupError) return groupError;
  const { data, error } = await supabaseServer
    .from('book_categories')
    .insert(value)
    .select('code')
    .single();
  if (error) return catalogError(error);
  return Response.json(data, { status: 201 });
}
