import Image from 'next/image';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-amber-100 bg-white/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
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
          <h1 className="font-serif text-xl text-amber-900 sm:text-2xl">
            책더하기사랑 도서관
          </h1>
        </div>
      </div>
    </header>
  );
}
