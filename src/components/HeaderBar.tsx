'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

export default function HeaderBar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const homeClassName = scrolled
    ? 'fixed inset-x-0 top-0 z-50 bg-[#fffdfa] shadow-md transition-all duration-300'
    : 'fixed inset-x-0 top-0 z-50 bg-[#fffdfa] shadow-md sm:bg-transparent sm:shadow-none sm:backdrop-blur-xs transition-all duration-300';

  const pageClassName = scrolled
    ? 'sticky top-0 z-50 bg-[#fffdfa] shadow-md transition-all duration-300'
    : 'header-bg sticky top-0 z-50 transition-all duration-300';

  return (
    <header className={isHome ? homeClassName : pageClassName}>
      {children}
    </header>
  );
}
