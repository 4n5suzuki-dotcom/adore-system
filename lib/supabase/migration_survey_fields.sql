-- =====================================================================
-- アンケート回答カラム マイグレーション（追加のみ・破壊的変更なし）
-- 実行場所: Supabase ダッシュボード > SQL Editor（再実行可）
--
-- 目的:
--   応募フォーム(/interview)の新ステップ「アンケート」(Q1-Q3)の回答を
--   interviews に保存する。未適用だと送信が 400（schema cache に列が無い）で
--   失敗するため、本番DBへ必ず適用すること（口座カラムと同じ既存DB不整合の予防）。
--
-- カラム:
--   source_channel     … Q1 当店を何で知ったか（web検索/インスタ/X(Twitter)/スカウト/知人の紹介/その他）
--   scout_company      … Q2 スカウト会社（Q1=スカウト時のみ。big/プログレス/フォックス/個人/その他）
--   application_reason … Q3 応募の決め手（時給・条件/お店の雰囲気/通いやすさ/知人の紹介/SNSの印象/その他）
--
-- 方針: ADD COLUMN IF NOT EXISTS で追加のみ。すべて NULL 許容。RLS は変更しない。
-- =====================================================================

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS source_channel     VARCHAR(50);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scout_company      VARCHAR(50);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS application_reason VARCHAR(50);

-- PostgREST スキーマキャッシュを即時リロード（反映が遅い場合に有効）
NOTIFY pgrst, 'reload schema';

-- 確認用:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'interviews'
--   AND column_name IN ('source_channel','scout_company','application_reason')
-- ORDER BY column_name;
