import { supabaseServer } from './server';

export function catalogError(error: { code?: string; message: string }) {
  if (error.code === '23505')
    return Response.json(
      { error: '동일한 이름 또는 코드가 이미 등록되어 있습니다.' },
      { status: 409 },
    );
  if (error.code === '23503')
    return Response.json(
      {
        error:
          '회원 또는 도서가 사용 중인 항목입니다. 연결을 변경한 후 다시 시도해주세요.',
      },
      { status: 409 },
    );
  console.error('Catalog operation failed', {
    code: error.code,
    message: error.message,
  });
  return Response.json(
    {
      error:
        error.code === '42501'
          ? '관리 권한 설정이 필요합니다. 관리자에게 문의해주세요.'
          : '처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
    },
    { status: 500 },
  );
}

export async function categoryGroupError(code: string, label: string) {
  const { data, error } = await supabaseServer
    .from('book_categories')
    .select('main_label')
    .eq('main_code', code)
    .limit(1);
  if (error) return catalogError(error);
  if (data?.length && data[0].main_label !== label) {
    return Response.json(
      { error: '기존 대분류명과 일치하지 않습니다. 목록을 새로고침해주세요.' },
      { status: 409 },
    );
  }
  return null;
}
