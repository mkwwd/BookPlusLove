'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { supabase } from '@/utils/supabase/client';

const bookmarkClipPath = {
  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
};

const bookmarkClass =
  'bg-gray-900 px-4 pt-1.5 pb-3.5 text-base text-white hover:bg-gray-800';

export default function HeaderTopBar({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const inAdminSection = pathname.startsWith('/admin');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex gap-2">
      {isLoggedIn ? (
        <>
          {isAdmin &&
            (inAdminSection ? (
              <Link href="/" className={bookmarkClass} style={bookmarkClipPath}>
                홈
              </Link>
            ) : (
              <Link
                href="/admin"
                className={bookmarkClass}
                style={bookmarkClipPath}>
                관리자
              </Link>
            ))}
          <button
            type="button"
            onClick={handleLogout}
            className={`cursor-pointer ${bookmarkClass}`}
            style={bookmarkClipPath}>
            로그아웃
          </button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className={bookmarkClass}
            style={bookmarkClipPath}>
            로그인
          </Link>
          <Link
            href="/register"
            className={bookmarkClass}
            style={bookmarkClipPath}>
            회원가입
          </Link>
        </>
      )}
    </div>
  );
}
