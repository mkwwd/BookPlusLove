import { BookPlus, BookText, Handshake, Users } from 'lucide-react';
import Link from 'next/link';

import { supabaseServer } from '@/utils/supabase/server';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function getStats() {
  const weekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();

  const [
    { count: totalMembers },
    { count: totalBooks },
    { count: onLoan },
    { count: newThisWeek },
  ] = await Promise.all([
    supabaseServer.from('users').select('*', { count: 'exact', head: true }),
    supabaseServer
      .from('book_copies')
      .select('*', { count: 'exact', head: true }),
    supabaseServer
      .from('book_copies')
      .select('*', { count: 'exact', head: true })
      .eq('status', '대여중'),
    supabaseServer
      .from('book_copies')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
  ]);

  return {
    totalMembers: totalMembers ?? 0,
    totalBooks: totalBooks ?? 0,
    onLoan: onLoan ?? 0,
    newThisWeek: newThisWeek ?? 0,
  };
}

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

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const STATS = [
    { label: '전체 회원', value: `${stats.totalMembers}명`, icon: Users },
    { label: '전체 도서', value: `${stats.totalBooks}권`, icon: BookText },
    { label: '대출 중', value: `${stats.onLoan}건`, icon: Handshake },
    {
      label: '이번 주 신규 등록',
      value: `${stats.newThisWeek}권`,
      icon: BookPlus,
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="font-serif text-3xl text-amber-950">대시보드</h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-amber-900/20 bg-white/40 p-5 shadow-sm backdrop-blur-sm">
            <Icon className="h-5 w-5 text-red-900" />
            <p className="mt-3 text-base text-amber-800">{label}</p>
            <p className="mt-1 text-2xl font-medium text-amber-950">{value}</p>
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
            <p className="mt-3 text-lg font-medium text-amber-950">{label}</p>
            <p className="mt-1 text-base text-amber-800">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
