'use client';

import { BookPlus, Handshake, LayoutDashboard, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/loans', label: '대출/대여', icon: Handshake },
  { href: '/admin/books', label: '도서 등록', icon: BookPlus },
  { href: '/admin/members', label: '회원 관리', icon: Users },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-amber-900/20 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 py-4 font-serif text-lg text-gray-900">
          <LayoutDashboard className="h-5 w-5" />
          관리자
        </Link>

        <div className="flex gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-4 text-base transition ${
                  isActive
                    ? 'border-red-900 text-red-900'
                    : 'border-transparent text-gray-700 hover:text-gray-900'
                }`}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
