import { Search } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  대출중: 'bg-amber-100 text-amber-800',
  연체: 'bg-red-100 text-red-800',
  반납완료: 'bg-green-100 text-green-800',
};

const LOANS = [
  {
    book: '혼자여도 괜찮은 시간',
    member: '한소연',
    loanedAt: '2026-07-14',
    dueAt: '2026-07-28',
    status: '대출중',
  },
  {
    book: '침묵의 기도학교',
    member: '이현민',
    loanedAt: '2026-06-30',
    dueAt: '2026-07-14',
    status: '연체',
  },
  {
    book: '고백록',
    member: '정요한',
    loanedAt: '2026-07-01',
    dueAt: '2026-07-15',
    status: '반납완료',
  },
  {
    book: '사랑의 기술',
    member: '배승주',
    loanedAt: '2026-07-18',
    dueAt: '2026-08-01',
    status: '대출중',
  },
];

export default function AdminLoansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl text-amber-900">대출/대여 관리</h2>
        <button
          type="button"
          className="rounded bg-red-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-red-800">
          신규 대출 등록
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-amber-900" />
        <input
          type="text"
          placeholder="도서명 또는 회원명 검색"
          className="w-full rounded border border-amber-900/30 bg-white/70 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-base">
          <thead className="border-b border-amber-900/20 text-amber-700">
            <tr>
              <th className="px-5 py-3 font-medium">도서명</th>
              <th className="px-5 py-3 font-medium">대출자</th>
              <th className="px-5 py-3 font-medium">대출일</th>
              <th className="px-5 py-3 font-medium">반납예정일</th>
              <th className="px-5 py-3 font-medium">상태</th>
              <th className="px-5 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {LOANS.map((loan, i) => (
              <tr key={i}>
                <td className="px-5 py-3 text-amber-900">{loan.book}</td>
                <td className="px-5 py-3 text-amber-900">{loan.member}</td>
                <td className="px-5 py-3 text-amber-700">{loan.loanedAt}</td>
                <td className="px-5 py-3 text-amber-700">{loan.dueAt}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded px-2 py-1 text-sm font-medium ${STATUS_STYLE[loan.status]}`}>
                    {loan.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    className="text-sm text-amber-700 hover:text-amber-900 hover:underline">
                    반납 처리
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
