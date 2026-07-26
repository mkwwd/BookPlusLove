import Image from 'next/image';
import Link from 'next/link';

export default function HeaderBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 pt-3">
      <div className="relative h-10 w-10 shrink-0">
        <Image
          src="/image/logo.png"
          alt="로고"
          fill
          priority
          className="object-contain"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl text-amber-900 sm:text-3xl">
          책더하기사랑도서관
        </h1>
        <span className="text-sm text-amber-950/70">광주가톨릭평생교육원</span>
      </div>
    </Link>
  );
}
