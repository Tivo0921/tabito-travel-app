-- 認証済みユーザーが purchases に自分の行を直接 INSERT できるポリシーを削除する。
--
-- 20260506000001 で PoC 用に追加したもので、Supabase API を直接呼べば
-- 決済せずに status='completed' の行（＝閲覧権限）を自分に付与できた。
-- 購入の記録は、Stripe で支払いを確認したサーバー側（service role）だけが行う:
--   - app/api/checkout/verify/route.ts（決済後のリダイレクト）
--   - app/api/webhook/route.ts（Stripe Webhook）
-- service role は RLS をバイパスするため、INSERT ポリシーは不要。
DROP POLICY IF EXISTS "purchases_insert_own" ON purchases;
