'use client';

import { useState } from 'react';

import { Menu } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/utils/supabase/client';

const bookmarkClipPath = {
  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
};

const bookmarkClass =
  'bg-red-900 px-4 pt-1.5 pb-3.5 text-base text-white hover:bg-red-800';

interface MenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export default function HeaderTopBar({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const items: MenuItem[] = isLoggedIn
    ? [
        ...(isAdmin ? [{ label: '관리자', href: '/admin' }] : []),
        { label: '로그아웃', onClick: handleLogout },
      ]
    : [
        { label: '로그인', href: '/login' },
        { label: '회원가입', href: '/register' },
      ];

  return (
    <>
      <div className="hidden gap-2 sm:flex">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={bookmarkClass}
              style={bookmarkClipPath}>
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={`cursor-pointer ${bookmarkClass}`}
              style={bookmarkClipPath}>
              {item.label}
            </button>
          ),
        )}
      </div>

      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="메뉴 열기"
          className={`cursor-pointer ${bookmarkClass}`}
          style={bookmarkClipPath}>
          <Menu className="h-5 w-5" />
        </button>

        {open && (
          <div className="absolute right-0 z-20 mt-2 w-32 overflow-hidden rounded-md border border-amber-900/10 bg-white shadow-lg">
            {items.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-amber-950 hover:bg-amber-50">
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-amber-950 hover:bg-amber-50">
                  {item.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </>
  );
}
