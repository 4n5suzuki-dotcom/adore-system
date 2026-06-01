-- =====================================================================
-- 再アプローチ機能 マイグレーション（追加のみ・破壊的変更なし）
-- 実行場所: Supabase ダッシュボード > SQL Editor（再実行可）
--
-- 目的:
--   中途半端ステータスのまま放置された応募者へ「再連絡」した記録を
--   interviews テーブルに残し、二重連絡を防ぐ。
--
-- 方針:
--   既存カラムは一切変更せず、ADD COLUMN IF NOT EXISTS で追加のみ。
--   RLS は変更しない（面接編集画面が authenticated で update 済みのため
--   再連絡の update も既存ポリシーのまま動作する）。
-- =====================================================================

-- 最後に再連絡した日時（未連絡 = NULL）。抽出条件の「未連絡判定」に使用。
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMP;

-- 再連絡した回数（初期値 0）。記録・将来の複数回フォロー用。
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS followup_count INT DEFAULT 0;

-- 抽出クエリ（status IN (...) AND last_followup_at IS NULL）の補助インデックス
CREATE INDEX IF NOT EXISTS idx_interviews_last_followup_at ON interviews(last_followup_at);

-- 確認用:
-- SELECT id, genshi_name, status, updated_at, last_followup_at, followup_count
-- FROM interviews ORDER BY updated_at ASC;
