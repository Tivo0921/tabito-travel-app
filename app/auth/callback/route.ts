import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 初回ログイン時だけ profiles を作る。
        // ignoreDuplicates で既存行には触れない。ここで上書きすると、
        // ユーザーが変更した表示名や言語設定がログインのたびに Google の値と
        // 'ko' に戻ってしまう。
        // メールアドレスは profiles に持たない（チャット相手に行ごと開放される
        // ポリシーがあるため）。通知の宛先が要る処理はサーバ側で auth.users を読む。
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            display_name: user.user_metadata?.full_name ?? user.email ?? 'ユーザー',
            avatar_url: user.user_metadata?.avatar_url ?? null,
            native_language: 'ko',
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );
        // profiles が無いと購入もプロフィール表示もできない。握り潰すと
        // 「ログイン済みなのに何も動かない」状態になるので、必ず表に出す。
        //
        // ただしセッションは成立しているので「ログインに失敗」ではない。
        // 汎用のログインエラーに混ぜると原因が分からなくなるため、
        // 専用の理由コードを渡して個別の文言と再試行導線を出す。
        if (profileError) {
          console.error('Profile creation failed:', profileError.code, profileError.message);
          return NextResponse.redirect(`${origin}/login?error=profile_failed`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    // code→セッション交換に失敗: 真因を特定するため実エラーを記録・伝播
    console.error('exchangeCodeForSession failed:', error.status, error.code, error.message);
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&code=${encodeURIComponent(error.code ?? 'unknown')}`
    );
  }

  console.error('OAuth callback: no code param', request.url);
  return NextResponse.redirect(`${origin}/login?error=auth_failed&code=no_code`);
}
