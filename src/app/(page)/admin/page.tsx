import { BookPlus, BookText, Handshake, Users } from 'lucide-react';
import Link from 'next/link';

const STATS = [
  { label: '전체 회원', value: '128명', icon: Users },
  { label: '전체 도서', value: '342권', icon: BookText },
  { label: '대출 중', value: '27건', icon: Handshake },
  { label: '이번 주 신규 등록', value: '6권', icon: BookPlus },
];

const QUICK_LINKS = [
  {
    href: '/admin/loans',
    label: '대출/대여 관리',
    description: '도서 대출 현황을 확인하고 반납을 처리합니다',
    icon: Handshake,
  },
  {
    href: '/admin/books',
    label: '도서 등록',
    description: '새로 들어온 도서를 등록합니다',
    icon: BookPlus,
  },
  {
    href: '/admin/members',
    label: '회원 관리',
    description: '회원 정보를 조회하고 관리합니다',
    icon: Users,
  },
];

const RECENT_ACTIVITY = [
  {
    date: '07.20',
    text: '한소연 회원이 「혼자여도 괜찮은 시간」을 대출했습니다',
  },
  { date: '07.19', text: '「낯설게 읽는 성경」 외 3권이 신규 등록되었습니다' },
  { date: '07.18', text: '이현민 회원이 「침묵의 기도학교」를 반납했습니다' },
  { date: '07.17', text: '정요한 회원이 신규 가입했습니다' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <h2 className="font-serif text-3xl text-gray-900">대시보드</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-amber-900/20 bg-white/40 p-5 shadow-sm backdrop-blur-sm">
            <Icon className="h-5 w-5 text-red-900" />
            <p className="mt-3 text-base text-gray-700">{label}</p>
            <p className="mt-1 text-2xl font-medium text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-amber-900/20 bg-white/40 p-6 shadow-sm backdrop-blur-sm transition hover:bg-amber-50">
            <Icon className="h-6 w-6 text-red-900" />
            <p className="mt-3 text-lg font-medium text-gray-900">{label}</p>
            <p className="mt-1 text-base text-gray-700">{description}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-amber-900/20 bg-white/40 p-6 shadow-sm backdrop-blur-sm">
        <h3 className="font-serif text-xl text-gray-900">최근 활동</h3>
        <ul className="mt-4 divide-y divide-amber-900/10">
          {RECENT_ACTIVITY.map((item, i) => (
            <li key={i} className="flex gap-4 py-3">
              <span className="w-12 shrink-0 text-base text-red-900">
                {item.date}
              </span>
              <span className="text-base text-gray-900">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
