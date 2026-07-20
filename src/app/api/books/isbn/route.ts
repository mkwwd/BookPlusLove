const NL_SEOJI_URL = 'https://www.nl.go.kr/seoji/SearchApi.do';

interface SeojiDoc {
  TITLE?: string;
  AUTHOR?: string;
  PUBLISHER?: string;
  EA_ISBN?: string;
  TITLE_URL?: string;
  PAGE?: string;
  PRE_PRICE?: string;
}

export async function GET(request: Request) {
  const isbn = new URL(request.url).searchParams.get('isbn')?.trim();

  if (!isbn) {
    return Response.json({ error: 'ISBN을 입력해주세요.' }, { status: 400 });
  }

  const certKey = process.env.NL_SEOJI_API_KEY;
  if (!certKey) {
    return Response.json(
      { error: '국립중앙도서관 API 키가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  const apiUrl = new URL(NL_SEOJI_URL);
  apiUrl.searchParams.set('cert_key', certKey);
  apiUrl.searchParams.set('result_style', 'json');
  apiUrl.searchParams.set('page_no', '1');
  apiUrl.searchParams.set('page_size', '1');
  apiUrl.searchParams.set('isbn', isbn);

  const res = await fetch(apiUrl);
  if (!res.ok) {
    return Response.json(
      { error: '서지정보 조회에 실패했습니다.' },
      { status: 502 },
    );
  }

  const body = await res.json();
  const doc: SeojiDoc | undefined = body?.docs?.[0];

  if (!doc) {
    return Response.json(
      { error: '등록된 서지정보를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({
    isbn: doc.EA_ISBN?.trim() || isbn,
    title: doc.TITLE?.trim() || '',
    author: doc.AUTHOR?.trim() || '',
    publisher: doc.PUBLISHER?.trim() || '',
    coverUrl: doc.TITLE_URL?.trim() || undefined,
    page: doc.PAGE?.trim() || undefined,
    price: doc.PRE_PRICE?.trim() || undefined,
  });
}
