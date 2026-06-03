-- =====================================================================
-- scout_company を自由記載に対応するため TEXT へ拡張（非破壊・widening）
-- 実行場所: Supabase ダッシュボード > SQL Editor（再実行可）
--
-- 背景:
--   スカウト情報はスタッフが管理画面で自由記載する運用に変更。
--   経緯メモ（例「スカウト経由で体入→連絡途絶→担当が外れ個人で再来店」）は
--   VARCHAR(50) を超えるため TEXT へ拡張する。
--
-- 安全性:
--   VARCHAR(50) → TEXT は widening。既存値はそのまま保持（切り詰め無し）。
--   DROP / narrowing ではないため破壊的変更ではない。NULL 許容のまま。RLS 不変。
-- =====================================================================

ALTER TABLE interviews ALTER COLUMN scout_company TYPE TEXT;

-- PostgREST スキーマキャッシュを即時リロード
NOTIFY pgrst, 'reload schema';

-- 確認用:
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'interviews' AND column_name = 'scout_company';
--   → data_type = text, character_maximum_length = NULL になればOK
