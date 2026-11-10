import { extractAuthorName } from '@/lib/author';
import { convertIsbn10To13 } from '@/lib/isbn';
import { normalizePublicationDate } from '@/lib/publicationDate';

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
        normalizePublicationDate(doc.PUBLISH_PREDATE) ??
        normalizePublicationDate(doc.REAL_PUBLISH_DATE) ??
        undefined,
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

  if (!process.env.NL_SEOJI_API_KEY) {
    return Response.json(
      { error: '국립중앙도서관 API 키가 설정되지 않았습니다.' },
      { status: 500 },
    );
  }

  // 국립중앙도서관 조회에는 구 ISBN(10자리)을 13자리로 변환한다.
  const cleaned = rawIsbn.replace(/[^0-9Xx]/g, '').toUpperCase();
  const isTenDigit = cleaned.length === 10;
  const isbn13 = isTenDigit ? convertIsbn10To13(cleaned) : cleaned;

  const nationalLibrary = await lookupFromNationalLibrary(isbn13);

  if (!nationalLibrary) {
    return Response.json(
      { error: '등록된 서지정보를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  return Response.json({ nationalLibrary });
}
