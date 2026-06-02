-- =====================================================================
-- 振込先情報カラム マイグレーション（追加のみ・破壊的変更なし）
-- 実行場所: Supabase ダッシュボード > SQL Editor（再実行可）
--
-- 目的:
--   応募フォーム(/interview)の Step7「振込先情報」が INSERT する
--   口座カラムが本番DBに無く、createInterview が 400
--   （Could not find the 'account_name' column ... in the schema cache）
--   で失敗するのを解消する。
--
-- 背景:
--   本番DBは振込先カラム追加より前のスキーマで構築された「既存DB」で、
--   schema.sql の ADD COLUMN IF NOT EXISTS（振込先）が未適用のまま。
--   PostgREST のスキーマキャッシュに account_name 等が無いため送信が失敗する。
--
-- 方針:
--   既存カラムは一切変更せず、ADD COLUMN IF NOT EXISTS で追加のみ。
--   任意入力のため全て NULL 許容（NOT NULL にせず既存行を壊さない）。
--   RLS は変更しない。
-- =====================================================================

ALTER TABLE interviews ADD COLUMN IF NOT EXISTS bank_name      VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS branch_name    VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS account_type   VARCHAR(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS account_name   VARCHAR(255);

-- PostgREST スキーマキャッシュを即時リロード（反映が遅い場合に有効）
NOTIFY pgrst, 'reload schema';

-- 確認用:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'interviews'
--   AND column_name IN ('bank_name','branch_name','account_type','account_number','account_name')
-- ORDER BY column_name;
