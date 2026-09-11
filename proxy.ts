import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * メンテナンス中でも通すパス。
 *
 * /auth/callback を止めると、Google から戻ってきた認可コードが交換されないまま
 * ルートハンドラが動かず、認証フローが中途半端に終わる。ユーザーから見ると
 * 「ログインしたのにログインできていない」状態になる。
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

  // Next.js のプリフェッチは、ユーザーの操作ではない投機的リクエスト。
  // 素通しする目的は、下の supabase.auth.getUser() を走らせないこと。
  //
  // ホーム1回の表示でプリフェッチが12件以上飛ぶ（実測: 全44リクエスト、
  // うち /explore が6回）。ログイン済みだと1件ごとに getUser() が実際に
  // ネットワークへ出るため、Supabase の auth が詰まって 504 / 522 を返す。
  // 5xx にはCORSヘッダが付かないので、ブラウザには
  // 「No 'Access-Control-Allow-Origin' header」として見えていた。
  //
  // 重複フェッチそのものはこれでは減らない。全ルートが no-store なのは
  // app/layout.tsx の resolveLocale() が cookies() / headers() を読んで
  // いるためで（lib/i18n/server.ts）、proxy とは別の要因。言語のCookie方式は
  // CLAUDE.md で維持すると決めているので、重複を減らすなら別の設計が要る。
  //
  // 実際の遷移はこのヘッダを持たないので proxy を通る。ただしプリフェッチ
  // 済みの結果がルーターキャッシュから再利用された遷移はサーバーに届かず、
  // サーバー側のセッション更新は走らない。現状は認証がすべてクライアント側
  // （createBrowserClient がトークンを更新して Cookie を書き、route handler は
  // 自前で getUser する）なので挙動は変わらないが、**サーバー描画に認証を
  // 持ち込むときはこの前提に頼らないこと。**
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch';

  if (isPrefetch) {
    return NextResponse.next({ request });
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
