'use client';

import { useState } from 'react';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const inAdminSection = pathname.startsWith('/admin');
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.replace('/login');
  };

  const items: MenuItem[] = isLoggedIn
    ? [
        ...(isAdmin
          ? [
              inAdminSection
                ? { label: '\uD648', href: '/' }
                : { label: '\uAD00\uB9AC\uC790', href: '/admin' },
            ]
          : []),
        { label: '\uB85C\uADF8\uC544\uC6C3', onClick: handleLogout },
      ]
    : [
        { label: '\uB85C\uADF8\uC778', href: '/login' },
        { label: '\uD68C\uC6D0\uAC00\uC785', href: '/register' },
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
          aria-label="\uBA54\uB274 \uC5F4\uAE30"
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
