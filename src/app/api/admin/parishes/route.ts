import { parseParish } from '@/lib/adminCatalog';
import { requireAdmin } from '@/utils/supabase/admin';
import { catalogError } from '@/utils/supabase/catalog';
import { supabaseServer } from '@/utils/supabase/server';

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseServer
      .from('parishes')
      .select('id, parishname, is_verified, users(count)')
      .order('is_verified')
      .order('parishname')
      .order('id')
      .range(offset, offset + 999);
    if (error) return catalogError(error);
    rows.push(
      ...data.map(({ users, ...parish }) => ({
        ...parish,
        usageCount: users[0]?.count ?? 0,
      })),
    );
    if (data.length < 1000) break;
  }
  return Response.json({ items: rows });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const parsed = parseParish(await request.json().catch(() => null));
  if (parsed.error)
    return Response.json({ error: parsed.error }, { status: 400 });
  const { data, error } = await supabaseServer
    .from('parishes')
    .insert(parsed.value!)
    .select('id')
    .single();
  if (error) return catalogError(error);
  return Response.json(data, { status: 201 });
}
