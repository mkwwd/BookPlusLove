import Image from 'next/image';
import Link from 'next/link';

export default function HeaderBrand() {
  return (
    <Link href="/" className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0">
          <Image
            src="/image/logo.png"
            alt="로고"
            fill
            priority
            className="object-contain"
          />
        </div>
        <h1 className="font-serif text-2xl text-amber-900 sm:text-3xl">
          책더하기사랑도서관
        </h1>
      </div>

      <span className="text-sm text-amber-950/70">광주가톨릭평생교육원</span>
    </Link>
  );
}
