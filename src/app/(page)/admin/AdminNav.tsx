'use client';

import { useState } from 'react';

import {
  BookPlus,
  Handshake,
  LayoutDashboard,
  Menu,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/loans', label: '대출/대여', icon: Handshake },
  { href: '/admin/books', label: '도서 관리', icon: BookPlus },
  { href: '/admin/members', label: '회원 관리', icon: Users },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isItemActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <nav className="relative z-40 border-b border-amber-900/20 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <div className="hidden items-center justify-between gap-4 sm:flex">
          <Link
            href="/admin"
            className="flex items-center gap-2 py-4 font-serif text-lg text-amber-950">
            <LayoutDashboard className="h-5 w-5" />
            관리자 대시보드
          </Link>

          <div className="flex gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-4 text-base transition ${
                  isItemActive(href)
                    ? 'border-red-900 text-red-900'
                    : 'border-transparent text-amber-800 hover:text-amber-950'
                }`}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="sm:hidden">
          <div className="flex items-center justify-between py-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-serif text-lg text-amber-950">
              <LayoutDashboard className="h-5 w-5" />
              관리자 대시보드
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="관리자 메뉴 열기"
              className="rounded-md border border-amber-900/20 bg-white/60 p-2 text-amber-900">
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {open && (
            <div className="flex flex-wrap gap-2 border-t border-amber-900/10 py-3">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm ${
                    isItemActive(href)
                      ? 'border-red-900/30 bg-amber-50 text-red-900'
                      : 'border-amber-900/20 text-amber-950 hover:bg-amber-50'
                  }`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
