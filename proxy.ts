import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * メンテナンス中でも通すパス。
 *
 * /auth/callback を止めてはいけない。ここを /maintenance に飛ばすと
 * ルートハンドラが動かず、Google の認可コードが交換されないまま
 * code-verifier の Cookie がブラウザに residue として残る。
 * メンテ解除後にログインし直すと、その残骸と新しいフローが噛み合わず
 * pkce_code_verifier_not_found になり、サイトデータを消すまで直らない。
 *
 * コールバックは「既に外部で認証を終えた人を連れ戻すだけ」の経路なので、
 * メンテ中に通してもサービスを開いたことにはならない。
 * 連れ戻した先（/home 等）は通常どおりメンテに飛ぶ。
 */
const MAINTENANCE_EXEMPT_PATHS = ['/maintenance', '/auth/callback'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    process.env.MAINTENANCE_MODE === 'true' &&
    process.env.VERCEL_ENV === 'production' &&
    !MAINTENANCE_EXEMPT_PATHS.includes(pathname)
  ) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションを更新（重要: getUser()を必ず呼ぶ）
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
