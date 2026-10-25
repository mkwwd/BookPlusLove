export interface ParishInput {
  parishname: string;
  is_verified: boolean;
}

export interface CategoryInput {
  code: string;
  label: string;
  main_code: string;
  main_label: string;
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

export function parseCategory(body: unknown): Parsed<CategoryInput> {
  const input = body as Partial<CategoryInput> | null;
  const text = (key: keyof CategoryInput) =>
    typeof input?.[key] === 'string' ? input[key].trim() : '';
  const value = {
    code: text('code'),
    label: text('label'),
    main_code: text('main_code'),
    main_label: text('main_label'),
  };
  if (!/^\d{3}$/.test(value.code) || !/^\d{3}$/.test(value.main_code)) {
    return { error: '분류코드와 대분류코드는 세 자리 숫자로 입력해주세요.' };
  }
  if (
    !value.label ||
    value.label.length > 100 ||
    !value.main_label ||
    value.main_label.length > 100
  ) {
    return { error: '분류명과 대분류명을 1~100자로 입력해주세요.' };
  }
  return { value };
}
