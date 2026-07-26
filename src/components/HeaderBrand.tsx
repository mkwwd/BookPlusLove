import Image from 'next/image';
import Link from 'next/link';

export default function HeaderBrand() {
  return (
    <Link href="/" className="flex items-center gap-3 pt-5 pb-5">
      <div className="relative h-10 w-10 shrink-0 sm:h-[46px] sm:w-[46px]">
        <Image
          src="/image/logo.png"
          alt="로고"
          fill
          priority
          className="object-contain"
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <h1 className="font-serif text-2xl leading-none font-bold text-amber-900 sm:text-3xl">
          책더하기사랑도서관
        </h1>
        <span className="text-sm leading-none font-bold tracking-[8px] whitespace-nowrap text-amber-950/60 sm:tracking-[13.2px]">
          광주가톨릭평생교육원
        </span>
      </div>
    </Link>
  );
}
