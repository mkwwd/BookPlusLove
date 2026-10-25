import { parseCategory } from '@/lib/adminCatalog';
import { requireAdmin } from '@/utils/supabase/admin';
import { catalogError, categoryGroupError } from '@/utils/supabase/catalog';
import { supabaseServer } from '@/utils/supabase/server';

type Context = { params: Promise<{ code: string }> };

async function usedCategoryError(code: string) {
  const { count, error } = await supabaseServer
    .from('books')
    .select('id', { count: 'exact', head: true })
    .eq('category_code', code);
  if (error) return catalogError(error);
  if (count)
    return Response.json(
      {
        error: `${count}종의 도서가 사용하는 코드는 번호 변경이나 삭제를 할 수 없습니다. 분류명은 수정할 수 있습니다.`,
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
  const parsed = parseCategory(await request.json().catch(() => null));
  if (parsed.error)
    return Response.json({ error: parsed.error }, { status: 400 });
  const value = parsed.value!;
  if (value.code !== code) {
    const usageError = await usedCategoryError(code);
    if (usageError) return usageError;
  }
  const groupError = await categoryGroupError(value.main_code);
  if (groupError) return groupError;
  const { data, error } = await supabaseServer
    .from('book_categories')
    .update(value)
    .eq('code', code)
    .select('code')
    .maybeSingle();
  if (error) return catalogError(error);
  if (!data)
    return Response.json(
      { error: '분류코드를 찾을 수 없습니다.' },
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
  const usageError = await usedCategoryError(code);
  if (usageError) return usageError;
  const { data, error } = await supabaseServer
    .from('book_categories')
    .delete()
    .eq('code', code)
    .select('code')
    .maybeSingle();
  if (error) return catalogError(error);
  if (!data)
    return Response.json(
      { error: '분류코드를 찾을 수 없습니다.' },
      { status: 404 },
    );
  return Response.json({ ok: true });
}
