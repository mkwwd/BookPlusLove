import { isValidRegNo } from '@/lib/regNo';
import { createRouteClient } from '@/utils/supabase/route';
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

export async function POST(request: Request) {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { data: profile } = await supabaseServer
    .from('users')
    .select('role')
    .eq('email', user.email)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    return Response.json(
      { error: '관리자만 도서를 등록할 수 있습니다.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const books = Array.isArray(body?.books)
    ? (body.books as IncomingBook[])
    : [];

  if (books.length === 0) {
    return Response.json({ error: '등록할 도서가 없습니다.' }, { status: 400 });
  }

  for (const book of books) {
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
