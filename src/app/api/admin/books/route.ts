import {
  categoryGroupLabel,
  type CategoryGroupRelation,
} from '@/lib/bookCategory';
import { normalizePublicationDate } from '@/lib/publicationDate';
import { isValidRegNo } from '@/lib/regNo';
import { requireAdmin } from '@/utils/supabase/admin';
import { withBookCoverCleanup } from '@/utils/supabase/bookCover';
import { supabaseServer } from '@/utils/supabase/server';

interface IncomingBook {
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
  seriesTitle?: string;
  aladinItemId?: number;
  category: string;
  authorCode: string;
  donorName: string;
  donorUserId?: number | null;
  regNo: string;
}

interface FailedItem {
  title: string;
  regNo: string;
  error: string;
}

interface BookCategoryRow extends CategoryGroupRelation {
  label: string;
  main_code: string;
}

interface BookRow {
  id: number;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_url: string | null;
  page: string | null;
  price: string | null;
  pub_date: string | null;
  author_code: string | null;
  category_code: string | null;
  is_recommended: boolean;
  aladin_item_id: number | null;
  book_categories: BookCategoryRow | BookCategoryRow[] | null;
}

interface BookCopyRow {
  id: number;
  reg_no: string;
  status: string;
  donor_name: string | null;
  donor_user_id: number | null;
  books: BookRow | BookRow[] | null;
}

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = new URL(request.url).searchParams;
  const pageInput = params.get('page') ?? '1';
  const requestedPage = Number(pageInput);
  const search = (params.get('q') ?? '').trim();
  const recommended = params.get('recommended') === 'true';
  if (
    !/^[1-9]\d*$/.test(pageInput) ||
    !Number.isSafeInteger(requestedPage) ||
    requestedPage > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) ||
    search.length > 200
  ) {
    return Response.json(
      { error: '페이지 번호 또는 검색어가 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  // Separate the matching embed so a registration-number match retains all book metadata.
  const query = (head: boolean) => {
    let result = supabaseServer.from('book_copies').select(
      `id, reg_no, status, donor_name, donor_user_id,
        books${recommended ? '!inner' : ''}(id, isbn, title, author, publisher, cover_url, page, price, pub_date, author_code, category_code, is_recommended, aladin_item_id,
          book_categories(label, main_code, book_category_groups(label)))${search ? ', matched_books:books()' : ''}`,
      head ? { count: 'exact', head: true } : undefined,
    );
    if (recommended) result = result.eq('books.is_recommended', true);
    if (search) {
      // A quoted, escaped regex preserves literal %, _, * and filter punctuation.
      const pattern = JSON.stringify(
        search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      );
      result = result
        .or(`title.imatch.${pattern},author.imatch.${pattern}`, {
          referencedTable: 'matched_books',
        })
        .or(`reg_no.imatch.${pattern},matched_books.not.is.null`);
    }
    return result;
  };

  // Count without downloading rows, then clamp pages after deletion/filter changes.
  const { count, error: countError } = await query(true);
  if (countError)
    return Response.json({ error: countError.message }, { status: 500 });
  const total = count ?? 0;
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(total / PAGE_SIZE)),
  );
  if (total === 0)
    return Response.json({ books: [], total, page, pageSize: PAGE_SIZE });

  const offset = (page - 1) * PAGE_SIZE;
  const { data, error: listError } = await query(false)
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
    .returns<BookCopyRow[]>();
  if (listError) {
    return Response.json({ error: listError.message }, { status: 500 });
  }

  const books = (data ?? []).map((row) => {
    const book = Array.isArray(row.books) ? row.books[0] : row.books;
    const category = book?.book_categories
      ? Array.isArray(book.book_categories)
        ? book.book_categories[0]
        : book.book_categories
      : null;

    return {
      copyId: row.id,
      bookId: book?.id ?? null,
      regNo: row.reg_no,
      status: row.status,
      donorName: row.donor_name,
      donorUserId: row.donor_user_id,
      isbn: book?.isbn ?? null,
      title: book?.title ?? '(제목 없음)',
      author: book?.author ?? null,
      publisher: book?.publisher ?? null,
      coverUrl: book?.cover_url ?? null,
      page: book?.page ?? null,
      price: book?.price ?? null,
      pubDate: book?.pub_date ?? null,
      authorCode: book?.author_code ?? null,
      isRecommended: book?.is_recommended ?? false,
      aladinItemId: book?.aladin_item_id ?? null,
      categoryCode: book?.category_code ?? null,
      categoryMain: category?.main_code ?? null,
      categoryLabel: category
        ? `${categoryGroupLabel(category)} > ${category.label}`
        : null,
    };
  });

  return Response.json({ books, total, page, pageSize: PAGE_SIZE });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin(
    '관리자만 도서를 등록할 수 있습니다.',
  );
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const books = Array.isArray(body?.books)
    ? (body.books as IncomingBook[])
    : [];

  const response = await registerBooks(books);
  return withBookCoverCleanup(
    books.map((book) => book?.coverUrl),
    response,
  );
}

async function registerBooks(books: IncomingBook[]) {
  if (books.length === 0) {
    return Response.json({ error: '등록할 도서가 없습니다.' }, { status: 400 });
  }

  for (const book of books) {
    const pubDate = normalizePublicationDate(book.pubDate);
    if (pubDate === undefined) {
      return Response.json(
        {
          error: `등록번호 ${book.regNo}의 출판일을 확인해주세요. 연도, 연월 또는 전체 날짜를 정확히 입력해주세요.`,
        },
        { status: 400 },
      );
    }
    book.pubDate = pubDate ?? undefined;
    if (!book.title?.trim()) {
      return Response.json(
        { error: '제목이 비어있는 도서가 있습니다.' },
        { status: 400 },
      );
    }
    if (!isValidRegNo(book.regNo ?? '')) {
      return Response.json(
        {
          error: `"${book.title}"의 등록번호(${book.regNo || '없음'})가 MB+숫자 6자리 형식이 아닙니다.`,
        },
        { status: 400 },
      );
    }
  }

  const regNos = books.map((b) => b.regNo.trim());
  if (new Set(regNos).size !== regNos.length) {
    return Response.json(
      { error: '요청 안에 등록번호가 중복된 도서가 있습니다.' },
      { status: 400 },
    );
  }

  let registered = 0;
  const failed: FailedItem[] = [];

  for (const book of books) {
    const isbn = book.isbn?.trim() || null;
    let bookId: number | null = null;

    if (isbn) {
      const { data: existing } = await supabaseServer
        .from('books')
        .select('id')
        .eq('isbn', isbn)
        .maybeSingle();
      bookId = existing?.id ?? null;
    }

    if (!bookId) {
      const { data: inserted, error: insertBookError } = await supabaseServer
        .from('books')
        .insert({
          isbn,
          title: book.title.trim(),
          author: book.author?.trim() || null,
          publisher: book.publisher?.trim() || null,
          cover_url: book.coverUrl || null,
          description: book.description || null,
          page: book.page || null,
          price: book.price || null,
          pub_date: book.pubDate || null,
          volume: book.volume || null,
          series_title: book.seriesTitle || null,
          aladin_item_id: book.aladinItemId ?? null,
          category_code: book.category || null,
          author_code: book.authorCode?.trim() || null,
        })
        .select('id')
        .single();

      if (insertBookError) {
        failed.push({
          title: book.title,
          regNo: book.regNo,
          error: `도서 정보 저장 실패: ${insertBookError.message}`,
        });
        continue;
      }
      bookId = inserted.id;
    }

    const { error: insertCopyError } = await supabaseServer
      .from('book_copies')
      .insert({
        book_id: bookId,
        reg_no: book.regNo.trim(),
        donor_name: book.donorName?.trim() || null,
        donor_user_id: book.donorUserId ?? null,
      });

    if (insertCopyError) {
      failed.push({
        title: book.title,
        regNo: book.regNo,
        error:
          insertCopyError.code === '23505'
            ? '이미 사용 중인 등록번호입니다.'
            : `등록 실패: ${insertCopyError.message}`,
      });
      continue;
    }

    registered += 1;
  }

  return Response.json({ registered, failed });
}
