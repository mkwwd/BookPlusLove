const RECENT_BOOKS = [
  {
    title: '혼자여도 괜찮은 시간',
    author: '한소연',
    registeredAt: '2026-07-19',
  },
  { title: '낯설게 읽는 성경', author: '배승주', registeredAt: '2026-07-19' },
  { title: '침묵의 기도학교', author: '이현민', registeredAt: '2026-07-18' },
];

export default function AdminBooksPage() {
  return (
    <div className="space-y-8">
      <h2 className="font-serif text-3xl text-amber-900">도서 등록</h2>

      <form className="space-y-6 rounded-lg border border-amber-900/20 bg-white/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-base font-medium text-amber-900">
              제목 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="도서 제목을 입력해주세요"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-base font-medium text-amber-900">
              저자 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="저자명을 입력해주세요"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-base font-medium text-amber-900">
              출판사
            </label>
            <input
              type="text"
              placeholder="출판사를 입력해주세요"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-base font-medium text-amber-900">
              ISBN
            </label>
            <input
              type="text"
              placeholder="ISBN을 입력해주세요"
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-base font-medium text-amber-900">
              카테고리
            </label>
            <select className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base text-amber-900 focus:ring-2 focus:ring-amber-900/30 focus:outline-none">
              <option>신앙/영성</option>
              <option>인문/소설</option>
              <option>에세이</option>
              <option>어린이/청소년</option>
              <option>기타</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-base font-medium text-amber-900">
              수량
            </label>
            <input
              type="number"
              min={1}
              defaultValue={1}
              className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-base font-medium text-amber-900">
            소개
          </label>
          <textarea
            rows={4}
            placeholder="도서 소개를 입력해주세요"
            className="w-full rounded border border-amber-900/20 bg-white/50 px-4 py-3 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/30 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-red-900 py-3 text-lg font-medium text-white transition hover:bg-red-800 sm:w-auto sm:px-8">
          등록
        </button>
      </form>

      <div className="rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
        <h3 className="px-6 pt-6 font-serif text-xl text-amber-900">
          최근 등록된 도서
        </h3>
        <ul className="mt-4 divide-y divide-amber-900/10 pb-2">
          {RECENT_BOOKS.map((book, i) => (
            <li key={i} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-base text-amber-900">{book.title}</p>
                <p className="text-sm text-amber-700">{book.author}</p>
              </div>
              <span className="text-sm text-amber-700">
                {book.registeredAt}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
