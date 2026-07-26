'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

export default function HeaderBar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;

    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  const homeClassName = scrolled
    ? 'header-bg fixed inset-x-0 top-0 z-50 backdrop-blur-sm transition-colors'
    : 'fixed inset-x-0 top-0 z-50 transition-colors';

  return (
    <header
      className={
        isHome
          ? homeClassName
          : 'header-bg sticky top-0 z-50 border-b border-amber-100/30 backdrop-blur-sm'
      }>
      {children}
    </header>
  );
}
