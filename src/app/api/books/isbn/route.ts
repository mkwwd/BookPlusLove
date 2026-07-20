const ALADIN_URL = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const NL_SEOJI_URL = 'https://www.nl.go.kr/seoji/SearchApi.do';

interface BookResult {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl?: string;
  description?: string;
  page?: string;
  price?: string;
}

interface AladinItem {
  isbn13?: string;
  title?: string;
  author?: string;
  publisher?: string;
  cover?: string;
  description?: string;
  priceStandard?: number;
}

interface SeojiDoc {
  TITLE?: string;
  AUTHOR?: string;
  PUBLISHER?: string;
  EA_ISBN?: string;
  TITLE_URL?: string;
  PAGE?: string;
  PRE_PRICE?: string;
}

async function lookupFromAladin(isbn: string): Promise<BookResult | null> {
  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) return null;

  const apiUrl = new URL(ALADIN_URL);
  apiUrl.searchParams.set('ttbkey', ttbKey);
  apiUrl.searchParams.set('itemIdType', 'ISBN13');
  apiUrl.searchParams.set('ItemId', isbn);
  apiUrl.searchParams.set('output', 'js');
  apiUrl.searchParams.set('Version', '20131101');
  apiUrl.searchParams.set('Cover', 'Big');

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return null;

    // The API returns JSONP-flavored output even without a CallBack param
    // (occasionally trailing a stray semicolon), so parse it manually
    // instead of res.json().
    const raw = (await res.text()).trim().replace(/;$/, '');
    const body: { item?: AladinItem[] } = JSON.parse(raw);
    const item = body.item?.[0];
    if (!item) return null;

    return {
      isbn: item.isbn13?.trim() || isbn,
      title: item.title?.trim() || '',
      author: item.author?.trim() || '',
      publisher: item.publisher?.trim() || '',
      coverUrl: item.cover?.trim() || undefined,
      description: item.description?.trim() || undefined,
      price: item.priceStandard ? String(item.priceStandard) : undefined,
    };
  } catch {
    return null;
  }
}

async function lookupFromNationalLibrary(
  isbn: string,
): Promise<BookResult | null> {
  const certKey = process.env.NL_SEOJI_API_KEY;
  if (!certKey) return null;

  const apiUrl = new URL(NL_SEOJI_URL);
  apiUrl.searchParams.set('cert_key', certKey);
  apiUrl.searchParams.set('result_style', 'json');
  apiUrl.searchParams.set('page_no', '1');
  apiUrl.searchParams.set('page_size', '1');
  apiUrl.searchParams.set('isbn', isbn);

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return null;

    const body = await res.json();
    const doc: SeojiDoc | undefined = body?.docs?.[0];
    if (!doc) return null;

    return {
      isbn: doc.EA_ISBN?.trim() || isbn,
      title: doc.TITLE?.trim() || '',
      author: doc.AUTHOR?.trim() || '',
      publisher: doc.PUBLISHER?.trim() || '',
      coverUrl: doc.TITLE_URL?.trim() || undefined,
      page: doc.PAGE?.trim() || undefined,
      price: doc.PRE_PRICE?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const isbn = new URL(request.url).searchParams.get('isbn')?.trim();

  if (!isbn) {
    return Response.json({ error: 'ISBN을 입력해주세요.' }, { status: 400 });
  }

  if (!process.env.ALADIN_TTB_KEY && !process.env.NL_SEOJI_API_KEY) {
    return Response.json(
      { error: '서지정보 API 키가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  // 알라딘(상업 서점)이 표지/줄거리가 더 잘 채워져 있어 먼저 조회하고,
  // 소규모/절판 도서라 알라딘에 없으면 국립중앙도서관 서지 데이터로 보완한다.
  const result =
    (await lookupFromAladin(isbn)) ?? (await lookupFromNationalLibrary(isbn));

  if (!result) {
    return Response.json(
      { error: '등록된 서지정보를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json(result);
}
