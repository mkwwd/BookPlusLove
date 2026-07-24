'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

export default function HeaderBar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header
      className={
        isHome
          ? 'fixed inset-x-0 top-0 z-50 border-b border-amber-100/70 shadow-[0_1px_10px_rgba(253,230,138,0.6)]'
          : 'header-bg sticky top-0 z-50 border-b border-amber-100 backdrop-blur-sm'
      }>
      {children}
    </header>
  );
}
