import { BookX } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <BookX className="mb-6 h-16 w-16 text-amber-900/40" />
        <h1 className="mb-2 font-serif text-3xl text-amber-950">
          페이지를 찾을 수 없어요
        </h1>
        <p className="mb-8 text-amber-700">
          요청하신 페이지가 삭제되었거나 주소가 잘못되었습니다.
        </p>
        <Link
          href="/"
          className="rounded bg-red-900 px-6 py-3 font-medium text-white transition hover:bg-red-800">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
