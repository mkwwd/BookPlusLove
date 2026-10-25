'use client';

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const bookmarkClipPath = {
  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
};

const bookmarkClass =
  'inline-flex h-14 w-24 shrink-0 items-start justify-center bg-red-900 px-2 pt-2 pb-5 text-lg whitespace-nowrap text-white hover:bg-red-800';

interface MenuItem {
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}

function MenuEntry({
  item,
  className,
  style,
  onSelect,
}: {
  item: MenuItem;
  className: string;
  style?: CSSProperties;
  onSelect?: () => void;
}) {
  if (item.href) {
    return (
      <Link
        href={item.href}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noreferrer' : undefined}
        onClick={onSelect}
        className={className}
        style={style}>
        {item.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        onSelect?.();
        item.onClick?.();
      }}
      className={`cursor-pointer ${className}`}
      style={style}>
      {item.label}
    </button>
  );
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.replace('/login');
  };

  const items: MenuItem[] = [
    {
      label: '교육원',
      href: 'https://www.kccei.com/fro_end/html/main/index.php',
      external: true,
    },
    { label: '공지사항', href: '/notices' },
  ];

  if (isLoggedIn) {
    if (isAdmin) {
      items.push(
        inAdminSection
          ? { label: '홈', href: '/' }
          : { label: '관리자', href: '/admin' },
      );
    }
    items.push({ label: '로그아웃', onClick: handleLogout });
  } else {
    items.push(
      { label: '로그인', href: '/login' },
      { label: '회원가입', href: '/register' },
    );
  }

  return (
    <>
      <nav
        aria-label="주 메뉴"
        className="hidden gap-2 drop-shadow-[0_3px_5px_rgba(0,0,0,0.2)] lg:flex">
        {items.map((item) => (
          <MenuEntry
            key={item.label}
            item={item}
            className={bookmarkClass}
            style={bookmarkClipPath}
          />
        ))}
      </nav>

      <div
        className="relative h-14 w-12 shrink-0 drop-shadow-[0_3px_5px_rgba(0,0,0,0.2)] lg:hidden"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            menuButtonRef.current?.focus();
          }
        }}>
        <div
          className={`absolute top-0 right-0 z-20 overflow-hidden bg-red-900 text-white transition-[width,height] duration-300 ease-out motion-reduce:transition-none ${open ? 'w-32' : 'w-12'}`}
          style={{
            height: `${open ? 3 + items.length * 3 + 1.5 : 3.5}rem`,
            clipPath:
              'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 18px), 0 100%)',
          }}>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={open}
            aria-controls="mobile-bookmark-menu"
            className="absolute top-0 right-0 inline-flex h-12 w-12 cursor-pointer items-center justify-center hover:bg-red-800 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <nav
            id="mobile-bookmark-menu"
            aria-label="모바일 주 메뉴"
            aria-hidden={!open}
            inert={!open}
            className={`absolute top-12 right-0 w-32 transition-opacity duration-150 motion-reduce:transition-none ${open ? 'opacity-100 delay-100' : 'opacity-0'}`}>
            {items.map((item) => (
              <MenuEntry
                key={item.label}
                item={item}
                onSelect={() => setOpen(false)}
                className="flex h-12 w-full items-center justify-center px-3 text-lg whitespace-nowrap hover:bg-red-800 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
              />
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
