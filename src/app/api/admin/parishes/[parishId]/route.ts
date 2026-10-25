import { parseParish } from '@/lib/adminCatalog';
import { requireAdmin } from '@/utils/supabase/admin';
import { catalogError } from '@/utils/supabase/catalog';
import { supabaseServer } from '@/utils/supabase/server';

type Context = { params: Promise<{ parishId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const { parishId } = await params;
  if (!/^\d+$/.test(parishId))
    return Response.json({ error: '잘못된 본당입니다.' }, { status: 400 });
  const parsed = parseParish(await request.json().catch(() => null));
  if (parsed.error)
    return Response.json({ error: parsed.error }, { status: 400 });
  const { data, error } = await supabaseServer
    .from('parishes')
    .update(parsed.value!)
    .eq('id', parishId)
    .select('id')
    .maybeSingle();
  if (error) return catalogError(error);
  if (!data)
    return Response.json(
      { error: '본당을 찾을 수 없습니다.' },
      { status: 404 },
    );
  return Response.json(data);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const { parishId } = await params;
  if (!/^\d+$/.test(parishId))
    return Response.json({ error: '잘못된 본당입니다.' }, { status: 400 });
  const { count, error: usageError } = await supabaseServer
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('parish_id', parishId);
  if (usageError) return catalogError(usageError);
  if (count)
    return Response.json(
      { error: `${count}명의 회원이 사용하는 본당은 삭제할 수 없습니다.` },
      { status: 409 },
    );
  const { data, error } = await supabaseServer
    .from('parishes')
    .delete()
    .eq('id', parishId)
    .select('id')
    .maybeSingle();
  if (error) return catalogError(error);
  if (!data)
    return Response.json(
      { error: '본당을 찾을 수 없습니다.' },
      { status: 404 },
    );
  return Response.json({ ok: true });
}
