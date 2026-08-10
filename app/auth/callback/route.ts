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
        // 初回ログイン時に profiles を作成し、再ログイン時は最新情報に更新する。
        // email は新着メッセージ通知の宛先に使うので Google から取得した値を保持する。
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            display_name: user.user_metadata?.full_name ?? user.email ?? 'ユーザー',
            avatar_url: user.user_metadata?.avatar_url ?? null,
            email: user.email ?? null,
            native_language: 'ko',
          },
          { onConflict: 'id' },
        );
        if (profileError) {
          console.error('Profile upsert error:', profileError.message, profileError);
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
