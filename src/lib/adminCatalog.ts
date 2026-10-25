export interface ParishInput {
  parishname: string;
  is_verified: boolean;
}

export interface CategoryGroupInput {
  code: string;
  label: string;
}

export interface CategoryInput extends CategoryGroupInput {
  main_code: string;
}

type Parsed<T> = { value: T; error?: never } | { error: string; value?: never };

export function parseParish(body: unknown): Parsed<ParishInput> {
  const input = body as Partial<ParishInput> | null;
  const name =
    typeof input?.parishname === 'string' ? input.parishname.trim() : '';
  if (!name || name.length > 50)
    return { error: '본당명을 1~50자로 입력해주세요.' };
  if (typeof input?.is_verified !== 'boolean')
    return { error: '승인 상태를 선택해주세요.' };
  return { value: { parishname: name, is_verified: input.is_verified } };
}

export function parseCategoryGroup(body: unknown): Parsed<CategoryGroupInput> {
  const input = body as Partial<CategoryGroupInput> | null;
  const text = (key: keyof CategoryGroupInput) =>
    typeof input?.[key] === 'string' ? input[key].trim() : '';
  const value = {
    code: text('code'),
    label: text('label'),
  };
  if (!/^\d{3}$/.test(value.code)) {
    return { error: '분류코드는 세 자리 숫자로 입력해주세요.' };
  }
  if (!value.label || value.label.length > 100) {
    return { error: '분류명을 1~100자로 입력해주세요.' };
  }
  return { value };
}

export function parseCategory(body: unknown): Parsed<CategoryInput> {
  const parsed = parseCategoryGroup(body);
  if (parsed.error) return { error: parsed.error };
  const input = body as Partial<CategoryInput> | null;
  const mainCode =
    typeof input?.main_code === 'string' ? input.main_code.trim() : '';
  if (!/^\d{3}$/.test(mainCode))
    return { error: '대분류코드는 세 자리 숫자로 입력해주세요.' };
  return { value: { ...parsed.value!, main_code: mainCode } };
}
