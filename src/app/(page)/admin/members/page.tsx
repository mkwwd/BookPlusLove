import { Search } from 'lucide-react';

const ROLE_STYLE: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  USER: 'bg-amber-100 text-amber-800',
};

const MEMBERS = [
  {
    userId: 'mkwhwkdud',
    name: '문건우',
    email: 'mkwhwkdud@gmail.com',
    parish: '광주 계림동성당',
    joinedAt: '2026-06-02',
    role: 'ADMIN',
  },
  {
    userId: 'sy_han',
    name: '한소연',
    email: 'sy.han@example.com',
    parish: '광주 임동성당',
    joinedAt: '2026-06-15',
    role: 'USER',
  },
  {
    userId: 'hm_lee',
    name: '이현민',
    email: 'hm.lee@example.com',
    parish: '광주 계림동성당',
    joinedAt: '2026-07-01',
    role: 'USER',
  },
  {
    userId: 'yh_jung',
    name: '정요한',
    email: 'yh.jung@example.com',
    parish: '광주 학동성당',
    joinedAt: '2026-07-17',
    role: 'USER',
  },
];

export default function AdminMembersPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-gray-900">회원 관리</h2>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-900" />
        <input
          type="text"
          placeholder="아이디, 이름 또는 이메일 검색"
          className="w-full rounded border border-amber-900/30 bg-white/70 py-2.5 pr-4 pl-9 text-base placeholder:text-amber-900/50 focus:ring-2 focus:ring-amber-900/20 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-amber-900/20 bg-white/70 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-base">
          <thead className="border-b border-amber-900/20 text-gray-700">
            <tr>
              <th className="px-5 py-3 font-medium">아이디</th>
              <th className="px-5 py-3 font-medium">이름</th>
              <th className="px-5 py-3 font-medium">이메일</th>
              <th className="px-5 py-3 font-medium">본당</th>
              <th className="px-5 py-3 font-medium">가입일</th>
              <th className="px-5 py-3 font-medium">권한</th>
              <th className="px-5 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-900/10">
            {MEMBERS.map((member) => (
              <tr key={member.userId}>
                <td className="px-5 py-3 text-gray-900">{member.userId}</td>
                <td className="px-5 py-3 text-gray-900">{member.name}</td>
                <td className="px-5 py-3 text-gray-700">{member.email}</td>
                <td className="px-5 py-3 text-gray-700">{member.parish}</td>
                <td className="px-5 py-3 text-gray-700">{member.joinedAt}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded px-2 py-1 text-sm font-medium ${ROLE_STYLE[member.role]}`}>
                    {member.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    className="text-sm text-gray-700 hover:text-gray-900 hover:underline">
                    상세보기
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
