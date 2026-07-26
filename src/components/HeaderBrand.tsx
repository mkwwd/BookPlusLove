'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HeaderBrand() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="relative h-8 w-8 shrink-0">
        <Image
          src="/image/logo.png"
          alt="로고"
          fill
          priority
          className={
            isHome
              ? 'object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]'
              : 'object-contain'
          }
        />
      </div>
      <h1
        className={
          isHome
            ? 'font-serif text-2xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] sm:text-3xl'
            : 'font-serif text-2xl text-amber-900 sm:text-3xl'
        }>
        책더하기사랑작은도서관
      </h1>
    </Link>
  );
}
