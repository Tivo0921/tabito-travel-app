import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  // ログイン中のユーザーを本人確認（Cookieのセッションから）
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const service = createServiceClient();
  const userId = user.id;

  // 本人に紐づくデータを削除（外部キーのcascade設定があれば一部は自動）
  await service.from('saved_items').delete().eq('user_id', userId);
  await service.from('plans').delete().eq('user_id', userId);
  await service.from('purchases').delete().eq('user_id', userId);
  await service.from('reviews').delete().eq('user_id', userId);
  await service.from('profiles').delete().eq('id', userId);

  // 認証ユーザー本体を削除（管理者API）
  const { error: deleteError } = await service.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('account deletion error:', deleteError);
    return NextResponse.json({ error: 'deletion_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
