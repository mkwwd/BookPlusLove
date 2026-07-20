import { Barcode, Plus, Search, SquarePen } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLE: Record<string, string> = {
  대여가능: 'bg-green-100 text-green-800',
  대여중: 'bg-rose-100 text-rose-700',
};

const BOOKS = [
  {
    title: '채식주의자',
    author: '한강',
    category: '문학 > 자서전',
    regNo: 'EM0000021622',
    status: '대여가능',
  },
  {
    title: '기도의 힘',
    author: '김수은',
    category: '종교 > 성서일반',
    regNo: 'EM0000021623',
    status: '대여중',
  },
  {
    title: '작별하지 않는다',
    author: '한강',
    category: '문학 > 소설',
    regNo: 'EM0000021624',
    status: '대여가능',
  },
  {
    title: '고백록',
    author: '아우구스티노',
    category: '종교 > 영성',
    regNo: 'EM0000021625',
    status: '대여가능',
  },
];

export default function AdminBooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-amber-900">도서 목록 관리</h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-900" />
            <input
              type="text"
              placeholder="제목 또는 저자 검색"
              className="w-64 rounded border border-amber-900/30 bg-white/70 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
            />
          </div>
          <Link
            href="/admin/books/new?method=barcode"
            className="flex items-center gap-1.5 rounded border border-amber-900/30 bg-white/70 px-4 py-2.5 text-base text-amber-900 transition hover:bg-amber-50">
            <Barcode className="h-4 w-4" />
            바코드
          </Link>
          <Link
            href="/admin/books/new"
            className="flex items-center gap-1.5 rounded bg-red-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
            <Plus className="h-4 w-4" />
            도서 등록
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-base">
          <thead className="border-b border-amber-900/20 text-amber-700">
            <tr>
              <th className="px-5 py-3 font-medium">제목</th>
              <th className="px-5 py-3 font-medium">저자</th>
              <th className="px-5 py-3 font-medium">카테고리</th>
              <th className="px-5 py-3 font-medium">등록번호</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {BOOKS.map((book) => (
              <tr key={book.regNo}>
                <td className="px-5 py-3 text-amber-900">{book.title}</td>
                <td className="px-5 py-3 text-amber-700">{book.author}</td>
                <td className="px-5 py-3">
                  <span className="font-medium text-amber-800 underline decoration-amber-400 underline-offset-2">
                    {book.category}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-sm text-amber-700">
                  {book.regNo}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded px-2 py-1 text-sm font-medium ${STATUS_STYLE[book.status]}`}>
                    {book.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    aria-label="수정"
                    className="text-amber-600 hover:text-amber-900">
                    <SquarePen className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
