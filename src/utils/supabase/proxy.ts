import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session cookie if needed; the main page is public and
  // no longer requires a redirect for logged-out visitors.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already-logged-in users shouldn't see the login/signup/find-account
  // forms again. /reset-password is excluded: it's where the password
  // recovery email links to, and must stay reachable even if this browser
  // still has an older session cookie — that page gates itself on the
  // PASSWORD_RECOVERY auth event instead.
  const AUTH_ONLY_PATHS = ['/login', '/register', '/find'];
  if (user && AUTH_ONLY_PATHS.includes(request.nextUrl.pathname)) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
