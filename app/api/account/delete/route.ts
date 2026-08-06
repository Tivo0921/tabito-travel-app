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

  // 認証ユーザーを削除すると、profiles (id → auth.users ON DELETE CASCADE) を
  // 起点に plans / plan_items / saved_items / purchases / reviews まで DB の
  // 外部キーカスケードで一括削除される（guides・記事の author は SET NULL）。
  // 削除を1操作に集約することで「データだけ消えてログインは可能」といった
  // 部分失敗による不整合を防ぎ、成功か無変更かのどちらかになる。
  const service = createServiceClient();
  const { error: deleteError } = await service.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('account deletion error:', deleteError);
    return NextResponse.json({ error: 'deletion_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
