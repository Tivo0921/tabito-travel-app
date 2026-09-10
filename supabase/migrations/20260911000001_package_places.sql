-- ════════════════════════════════════════════════════════════════
-- パッケージに開始地点・終了地点を持たせる #16
--
-- 計画上の移動は「パッケージAの終了地点 → パッケージBの開始地点」で
-- 計算する。スポット単位の place_id は今回は持たせない（将来拡張）。
--
-- place_id / name / 緯度 / 経度 の4点を焼き付ける。
--   place_id … 店舗移転や改名に Places API で追従するための手がかり。
--               ただし永続保証がないので、これ単体には頼らない
--   name / 座標 … place_id が引けなくなっても表示と経路計算ができるように
-- ════════════════════════════════════════════════════════════════

ALTER TABLE packages
  ADD COLUMN start_place_id   text,
  ADD COLUMN start_place_name text,
  ADD COLUMN start_latitude   numeric(9, 6),
  ADD COLUMN start_longitude  numeric(9, 6),
  ADD COLUMN end_place_id     text,
  ADD COLUMN end_place_name   text,
  ADD COLUMN end_latitude     numeric(9, 6),
  ADD COLUMN end_longitude    numeric(9, 6);

-- ────────────────────────────────────────────────
-- 4点セットは「全部ある」か「全部ない」だけを許す。
-- 名前だけ・座標だけの行は地図にも経路にも使えず、
-- 表示側が「設定済みかどうか」を判定できなくなる。
--
-- 既存パッケージは全列 NULL のまま通る（NOT NULL にはしない）。
-- 地点は入力UIができてからクリエイターが手で設定する。
-- ────────────────────────────────────────────────
ALTER TABLE packages
  ADD CONSTRAINT packages_start_place_complete CHECK (
    (start_place_id IS NULL AND start_place_name IS NULL
     AND start_latitude IS NULL AND start_longitude IS NULL)
    OR
    (start_place_id IS NOT NULL AND start_place_name IS NOT NULL
     AND start_latitude IS NOT NULL AND start_longitude IS NOT NULL)
  ),
  ADD CONSTRAINT packages_end_place_complete CHECK (
    (end_place_id IS NULL AND end_place_name IS NULL
     AND end_latitude IS NULL AND end_longitude IS NULL)
    OR
    (end_place_id IS NOT NULL AND end_place_name IS NOT NULL
     AND end_latitude IS NOT NULL AND end_longitude IS NOT NULL)
  );

-- 範囲外は入力ミス。DB で弾く
ALTER TABLE packages
  ADD CONSTRAINT packages_start_lat_range CHECK (start_latitude  IS NULL OR (start_latitude  BETWEEN -90  AND 90)),
  ADD CONSTRAINT packages_start_lng_range CHECK (start_longitude IS NULL OR (start_longitude BETWEEN -180 AND 180)),
  ADD CONSTRAINT packages_end_lat_range   CHECK (end_latitude    IS NULL OR (end_latitude    BETWEEN -90  AND 90)),
  ADD CONSTRAINT packages_end_lng_range   CHECK (end_longitude   IS NULL OR (end_longitude   BETWEEN -180 AND 180));

COMMENT ON COLUMN packages.start_place_id IS 'Google Places の place_id。name/座標と4点セットで入る（CHECK で保証）';
COMMENT ON COLUMN packages.end_place_id   IS 'Google Places の place_id。name/座標と4点セットで入る（CHECK で保証）';
