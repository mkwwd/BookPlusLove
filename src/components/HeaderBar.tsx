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
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const positionClass = isHome ? 'fixed inset-x-0' : 'sticky';
  const backgroundClass =
    isHome || scrolled ? 'bg-[#fffdfa] shadow-md' : 'header-bg';
  const transparentClass =
    isHome && !scrolled
      ? 'sm:bg-transparent sm:shadow-none sm:backdrop-blur-xs'
      : '';

  return (
    <header
      className={`${positionClass} top-0 z-50 ${backgroundClass} ${transparentClass} transition-all duration-300`.trim()}
      data-home={isHome}
      data-scrolled={scrolled}>
      {children}
    </header>
  );
}
