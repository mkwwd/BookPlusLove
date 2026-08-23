import { extractAuthorName } from '@/lib/author';
import { convertIsbn10To13 } from '@/lib/isbn';

const ALADIN_URL = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const NL_SEOJI_URL = 'https://www.nl.go.kr/seoji/SearchApi.do';

export interface BookResult {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverUrl?: string;
  description?: string;
  page?: string;
  price?: string;
  pubDate?: string;
  volume?: string;
  aladinItemId?: number;
}

interface AladinItem {
  itemId?: number;
  isbn13?: string;
  title?: string;
  author?: string;
  publisher?: string;
  cover?: string;
  description?: string;
  priceStandard?: number;
  pubDate?: string;
}

interface SeojiDoc {
  TITLE?: string;
  AUTHOR?: string;
  PUBLISHER?: string;
  EA_ISBN?: string;
  TITLE_URL?: string;
  PAGE?: string;
  PRE_PRICE?: string;
  PUBLISH_PREDATE?: string;
  REAL_PUBLISH_DATE?: string;
  VOL?: string;
  SERIES_NO?: string;
  BOOK_INTRODUCTION?: string;
}

// 알라딘은 "2017-03-31", 국립중앙도서관은 "20170331" 형태로 준다.
// 둘 다 "2017년 3월 31일" 형식으로 통일한다.
function formatPubDate(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  if (!match) return trimmed;
  const [, year, month, day] = match;
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

async function lookupFromAladin(
  isbn: string,
  itemIdType: 'ISBN' | 'ISBN13',
): Promise<BookResult | null> {
  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) return null;

  const apiUrl = new URL(ALADIN_URL);
  apiUrl.searchParams.set('ttbkey', ttbKey);
  apiUrl.searchParams.set('itemIdType', itemIdType);
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
      author: item.author?.trim() ? extractAuthorName(item.author.trim()) : '',
      publisher: item.publisher?.trim() || '',
      coverUrl: item.cover?.trim() || undefined,
      description: item.description?.trim() || undefined,
      price: item.priceStandard ? String(item.priceStandard) : undefined,
      pubDate: formatPubDate(item.pubDate),
      aladinItemId: item.itemId,
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
      author: doc.AUTHOR?.trim() ? extractAuthorName(doc.AUTHOR.trim()) : '',
      publisher: doc.PUBLISHER?.trim() || '',
      coverUrl: doc.TITLE_URL?.trim() || undefined,
      description: doc.BOOK_INTRODUCTION?.trim() || undefined,
      page: doc.PAGE?.trim() || undefined,
      price: doc.PRE_PRICE?.trim() || undefined,
      pubDate:
        formatPubDate(doc.PUBLISH_PREDATE) ??
        formatPubDate(doc.REAL_PUBLISH_DATE),
      volume: doc.VOL?.trim() || doc.SERIES_NO?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const rawIsbn = new URL(request.url).searchParams.get('isbn')?.trim();

  if (!rawIsbn) {
    return Response.json({ error: 'ISBN을 입력해주세요.' }, { status: 400 });
  }

  if (!process.env.ALADIN_TTB_KEY && !process.env.NL_SEOJI_API_KEY) {
    return Response.json(
      { error: '서지정보 API 키가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  // 2007년 이전 도서는 10자리 ISBN만 있는 경우가 많다. 알라딘은 10자리를
  // 그대로 조회할 수 있고, 국립중앙도서관은 13자리로 변환해서 조회한다.
  const cleaned = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();
  const isTenDigit = cleaned.length === 10;
  const aladinQuery = cleaned;
  const aladinType: 'ISBN' | 'ISBN13' = isTenDigit ? 'ISBN' : 'ISBN13';
  const isbn13 = isTenDigit ? convertIsbn10To13(cleaned) : cleaned;

  // 둘 다 조회해서 관리자가 화면에서 비교하고 항목별로 고를 수 있게 한다.
  const [aladin, nationalLibrary] = await Promise.all([
    lookupFromAladin(aladinQuery, aladinType),
    lookupFromNationalLibrary(isbn13),
  ]);

  if (!aladin && !nationalLibrary) {
    return Response.json(
      { error: '등록된 서지정보를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ aladin, nationalLibrary });
}
