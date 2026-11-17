-- 収益分配（#19, 20261112000001_purchase_revenue_split.sql）を PostgreSQL 上で確かめる。
--
-- 使い方（ローカル Supabase 起動中。DB は使い捨てのローカルに限る）:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f scripts/test-revenue-split.sql
-- 全体を1トランザクションで実行して最後に ROLLBACK するので、データは残らない。
-- 失敗すると ASSERT で止まる。最後まで進めば "ALL PASS" を出す。

BEGIN;

-- テスト用データ
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'buyer@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'creator1@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'creator2@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'other@example.com')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000f1')
ON CONFLICT DO NOTHING;
INSERT INTO public.areas (id, name) VALUES ('00000000-0000-0000-0000-00000000aaaa', 'rs-test-area');
INSERT INTO public.guides (id, user_id, location) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Tokyo'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'Osaka');
INSERT INTO public.packages (id, guide_id, area_id, price, status) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000aaaa', 2000, 'published'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000aaaa', 1005, 'published');

-- 1. 通常の購入: 2000円 → 運営 200 / クリエイター 1800、受取人は c1
INSERT INTO public.purchases (user_id, package_id, amount, currency, status, stripe_session_id)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 2000, 'JPY', 'completed', 'cs_rs_1');
DO $$
DECLARE r public.purchases;
BEGIN
  SELECT * INTO r FROM public.purchases WHERE stripe_session_id = 'cs_rs_1';
  ASSERT r.platform_fee_rate = 0.1, 'rate should be 0.1';
  ASSERT r.platform_fee = 200, format('fee 2000 -> 200, got %s', r.platform_fee);
  ASSERT r.creator_net = 1800, format('net 2000 -> 1800, got %s', r.creator_net);
  ASSERT r.creator_user_id = '00000000-0000-0000-0000-0000000000c1', 'creator should be c1';
  RAISE NOTICE 'PASS 1: 2000円の分配と受取人';
END $$;

-- 2. 端数: 1005円 → 100.5 は四捨五入で 101、クリエイター 904
--    1004円 → 100.4 は 100、904 / 1円 → 0.1 は 0、1 / 0円 → 0 / 0 / 5円 → 0.5 は 1、4
INSERT INTO public.purchases (user_id, package_id, amount, status, stripe_session_id) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d2', 1005, 'completed', 'cs_rs_2'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d2', 1004, 'completed', 'cs_rs_3'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d2', 1, 'completed', 'cs_rs_4'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d2', 0, 'completed', 'cs_rs_5'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d2', 5, 'pending', 'cs_rs_6');
DO $$
BEGIN
  ASSERT (SELECT platform_fee FROM public.purchases WHERE stripe_session_id = 'cs_rs_2') = 101, '1005 -> 101';
  ASSERT (SELECT creator_net  FROM public.purchases WHERE stripe_session_id = 'cs_rs_2') = 904, '1005 -> 904';
  ASSERT (SELECT platform_fee FROM public.purchases WHERE stripe_session_id = 'cs_rs_3') = 100, '1004 -> 100';
  ASSERT (SELECT platform_fee FROM public.purchases WHERE stripe_session_id = 'cs_rs_4') = 0, '1 -> 0';
  ASSERT (SELECT creator_net  FROM public.purchases WHERE stripe_session_id = 'cs_rs_4') = 1, '1 -> net 1';
  ASSERT (SELECT platform_fee + creator_net FROM public.purchases WHERE stripe_session_id = 'cs_rs_5') = 0, '0 -> 0';
  ASSERT (SELECT platform_fee FROM public.purchases WHERE stripe_session_id = 'cs_rs_6') = 1, '5 -> 1';
  RAISE NOTICE 'PASS 2: 端数の四捨五入と 0円';
END $$;

-- 3. 呼び出し側が渡した分配・受取人・率は使わない
INSERT INTO public.purchases (user_id, package_id, amount, status, stripe_session_id,
  creator_user_id, platform_fee_rate, platform_fee, creator_net)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 3000, 'completed', 'cs_rs_7',
  '00000000-0000-0000-0000-0000000000f1', 0.0000, 0, 3000);
DO $$
DECLARE r public.purchases;
BEGIN
  SELECT * INTO r FROM public.purchases WHERE stripe_session_id = 'cs_rs_7';
  ASSERT r.platform_fee = 300 AND r.creator_net = 2700 AND r.platform_fee_rate = 0.1, 'caller values must be overridden';
  ASSERT r.creator_user_id = '00000000-0000-0000-0000-0000000000c1', 'caller creator must be overridden';
  RAISE NOTICE 'PASS 3: 呼び出し側の値を上書きする';
END $$;

-- 4. 負の金額は拒否
DO $$
BEGIN
  BEGIN
    INSERT INTO public.purchases (user_id, package_id, amount, status, stripe_session_id)
    VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', -1, 'completed', 'cs_rs_neg');
    RAISE EXCEPTION 'negative amount should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'PASS 4: 負の金額を拒否';
END $$;

-- 5. 所有者が変わっても過去の受取人は動かない。新しい購入は新しい所有者
UPDATE public.packages SET guide_id = '00000000-0000-0000-0000-0000000000b2'
WHERE id = '00000000-0000-0000-0000-0000000000d1';
INSERT INTO public.purchases (user_id, package_id, amount, status, stripe_session_id)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 2000, 'completed', 'cs_rs_8');
DO $$
BEGIN
  ASSERT (SELECT creator_user_id FROM public.purchases WHERE stripe_session_id = 'cs_rs_1') = '00000000-0000-0000-0000-0000000000c1', 'old purchase keeps c1';
  ASSERT (SELECT creator_user_id FROM public.purchases WHERE stripe_session_id = 'cs_rs_8') = '00000000-0000-0000-0000-0000000000c2', 'new purchase goes to c2';
  RAISE NOTICE 'PASS 5: 所有者変更後も過去の受取人は固定';
END $$;

-- 6. 分配の列は UPDATE できない（service role でも）。status の変更はできる
DO $$
BEGIN
  BEGIN
    UPDATE public.purchases SET platform_fee = 0, creator_net = 2000 WHERE stripe_session_id = 'cs_rs_1';
    RAISE EXCEPTION 'fee update should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.purchases SET creator_user_id = '00000000-0000-0000-0000-0000000000f1' WHERE stripe_session_id = 'cs_rs_1';
    RAISE EXCEPTION 'creator update should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.purchases SET amount = 1 WHERE stripe_session_id = 'cs_rs_1';
    RAISE EXCEPTION 'amount update should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.purchases SET currency = 'USD' WHERE stripe_session_id = 'cs_rs_1';
    RAISE EXCEPTION 'currency update should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.purchases SET package_id = '00000000-0000-0000-0000-0000000000d2' WHERE stripe_session_id = 'cs_rs_1';
    RAISE EXCEPTION 'package_id update should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.purchases SET user_id = '00000000-0000-0000-0000-0000000000f1' WHERE stripe_session_id = 'cs_rs_1';
    RAISE EXCEPTION 'user_id update should fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE public.purchases SET status = 'refunded' WHERE stripe_session_id = 'cs_rs_8';
  ASSERT (SELECT status FROM public.purchases WHERE stripe_session_id = 'cs_rs_8') = 'refunded', 'status update allowed';
  RAISE NOTICE 'PASS 6: 分配・金額・通貨・パッケージ・購入者は不変、status は変更可';
END $$;

-- 7. 売上集計: c1 本人には completed かつ受取人 c1 の分だけ
--    c1: cs_rs_1 (2000/200/1800) + cs_rs_7 (3000/300/2700) = 2件 5000/500/4500
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.get_my_creator_earnings();
  ASSERT r.sales_count = 2, format('c1 count 2, got %s', r.sales_count);
  ASSERT r.gross_amount = 5000 AND r.platform_fee = 500 AND r.creator_net = 4500 AND r.unpaid_net = 4500,
    format('c1 sums, got %s/%s/%s/%s', r.gross_amount, r.platform_fee, r.creator_net, r.unpaid_net);
  RAISE NOTICE 'PASS 7: クリエイター本人の集計';
END $$;

-- 8. c2: completed は cs_rs_2..5（1005+1004+1+0）。pending の cs_rs_6 と refunded の cs_rs_8 は含めない
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.get_my_creator_earnings();
  ASSERT r.sales_count = 4, format('c2 count 4, got %s', r.sales_count);
  ASSERT r.gross_amount = 2010 AND r.platform_fee = 201 AND r.creator_net = 1809,
    format('c2 sums, got %s/%s/%s', r.gross_amount, r.platform_fee, r.creator_net);
  RAISE NOTICE 'PASS 8: pending / refunded を含めない';
END $$;

-- 9. 売上の無い利用者は 0 件 0 円（行は1行返る）
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.get_my_creator_earnings();
  ASSERT r.sales_count = 0 AND r.gross_amount = 0 AND r.unpaid_net = 0, 'no sales -> zeros';
  RAISE NOTICE 'PASS 9: 売上なしは 0';
END $$;

-- 10. 購入者は自分の購入行を読めるが、クリエイターは他人の購入行を読めない（RLS は従来どおり）
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.purchases) = 0, 'f1 sees no purchases';
  RAISE NOTICE 'PASS 10: クリエイター以外の他人は purchases を読めない';
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.purchases) = 0, 'creator c1 cannot read buyer rows';
  RAISE NOTICE 'PASS 11: クリエイターも購入者の行は読めない';
END $$;
RESET ROLE;

-- 12. 匿名は集計関数を呼べない
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.get_my_creator_earnings();
    RAISE EXCEPTION 'anon should not execute';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 12: anon は集計関数を実行できない';
END $$;
RESET ROLE;

-- 13. authenticated は purchases に書けない（従来どおり）
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.purchases SET status = 'completed' WHERE stripe_session_id = 'cs_rs_6';
    ASSERT NOT FOUND, 'authenticated update must affect 0 rows';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  ASSERT (SELECT status FROM public.purchases WHERE stripe_session_id = 'cs_rs_6') = 'pending', 'still pending';
  RAISE NOTICE 'PASS 13: 購入者は自分の購入行を書き換えられない';
END $$;
RESET ROLE;

-- 14. クリエイターがアカウントを削除しても購入記録は残り、受取人だけ NULL になる
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000c2';
DO $$
BEGIN
  ASSERT (SELECT creator_user_id FROM public.purchases WHERE stripe_session_id = 'cs_rs_2') IS NULL, 'creator nulled';
  ASSERT (SELECT creator_net FROM public.purchases WHERE stripe_session_id = 'cs_rs_2') = 904, 'net kept';
  RAISE NOTICE 'PASS 14: 受取人のアカウント削除で NULL、分配は残る';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL PASS'; END $$;
ROLLBACK;
