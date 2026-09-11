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
  // ここで Cookie に触れるとレスポンスが no-store になり、プリフェッチ結果が
  // ルーターキャッシュに載らない。その結果、同じルートを何度も取り直す
  // （実測: ホーム1回の表示で /explore を6回、全44リクエスト）。
  //
  // さらに1回ごとに下の supabase.auth.getUser() が走るため、Supabase 側が
  // 詰まって 504 / 522 を返し、それが CORS エラーとして表面化していた。
  //
  // 実際の画面遷移はこのヘッダを持たないので、セッション更新はそちらで
  // 従来どおり行われる。プリフェッチはHTMLを先読みするだけで、認証を要する
  // データはどの画面もクライアント側で取得しているため、挙動は変わらない。
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
