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

      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-xl leading-none font-black text-amber-900 drop-shadow-[1px_-0.5px_0.5px_rgba(255,255,255,0.8)] sm:text-3xl">
          책더하기사랑도서관
        </h1>
        <div className="flex justify-around text-sm leading-none font-bold text-amber-950/60 drop-shadow-[1px_1px_0px_rgba(255,255,255)]">
          {'광주가톨릭평생교육원'.split('').map((char, index) => (
            <span key={index}>{char}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}
