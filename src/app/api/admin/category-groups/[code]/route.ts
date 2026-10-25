import { parseCategoryGroup } from '@/lib/adminCatalog';
import { requireAdmin } from '@/utils/supabase/admin';
import { catalogError } from '@/utils/supabase/catalog';
import { supabaseServer } from '@/utils/supabase/server';

type Context = { params: Promise<{ code: string }> };

async function usedGroupError(code: string) {
  const { count, error } = await supabaseServer
    .from('book_categories')
    .select('code', { count: 'exact', head: true })
    .eq('main_code', code);
  if (error) return catalogError(error);
  if (count)
    return Response.json(
      {
        error: `${count}개의 소분류가 있어 코드 번호 변경이나 삭제를 할 수 없습니다. 대분류명은 수정할 수 있습니다.`,
      },
      { status: 409 },
    );
  return null;
}

export async function PATCH(request: Request, { params }: Context) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const { code } = await params;
  if (!/^\d{3}$/.test(code))
    return Response.json({ error: '잘못된 코드입니다.' }, { status: 400 });
  const parsed = parseCategoryGroup(await request.json().catch(() => null));
  if (parsed.error)
    return Response.json({ error: parsed.error }, { status: 400 });
  if (parsed.value!.code !== code) {
    const usageError = await usedGroupError(code);
    if (usageError) return usageError;
  }
  const { data, error } = await supabaseServer
    .from('book_category_groups')
    .update(parsed.value!)
    .eq('code', code)
    .select('code')
    .maybeSingle();
  if (error) return catalogError(error);
  if (!data)
    return Response.json(
      { error: '대분류를 찾을 수 없습니다.' },
      { status: 404 },
    );
  return Response.json(data);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;
  const { code } = await params;
  if (!/^\d{3}$/.test(code))
    return Response.json({ error: '잘못된 코드입니다.' }, { status: 400 });
  const usageError = await usedGroupError(code);
  if (usageError) return usageError;
  const { data, error } = await supabaseServer
    .from('book_category_groups')
    .delete()
    .eq('code', code)
    .select('code')
    .maybeSingle();
  if (error) return catalogError(error);
  if (!data)
    return Response.json(
      { error: '대분류를 찾을 수 없습니다.' },
      { status: 404 },
    );
  return Response.json({ ok: true });
}
