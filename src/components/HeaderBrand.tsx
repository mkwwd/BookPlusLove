import Image from 'next/image';
import Link from 'next/link';

export default function HeaderBrand() {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-2 pt-5 pb-5 sm:gap-3">
      <div className="relative h-8 w-8 shrink-0 sm:h-[46px] sm:w-[46px]">
        <Image
          src="/image/logo.png"
          alt="로고"
          fill
          priority
          className="object-contain"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-serif text-base leading-tight font-black break-words text-amber-900 drop-shadow-[1px_-0.5px_0.5px_rgba(255,255,255,0.8)] sm:text-3xl sm:leading-none">
          책더하기사랑도서관
        </h1>
        <div className="flex flex-wrap justify-around text-xs leading-none font-bold text-amber-950/60 drop-shadow-[1px_1px_0px_rgba(255,255,255)] sm:text-sm">
          {'광주가톨릭평생교육원'.split('').map((char, index) => (
            <span key={index}>{char}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
