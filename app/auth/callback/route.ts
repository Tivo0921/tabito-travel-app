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
        // 初回ログイン時にprofilesレコードを作成（既存の場合は無視）
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          display_name: user.user_metadata?.full_name ?? user.email ?? 'ユーザー',
          avatar_url: user.user_metadata?.avatar_url ?? null,
          native_language: 'ko',
        });
        if (profileError && profileError.code !== '23505') {
          console.error('Profile creation error:', profileError);
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
