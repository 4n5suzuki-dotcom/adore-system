-- =====================================================================
-- casts / cast_performance の RLS ポリシー
-- 実行場所: Supabase ダッシュボード > SQL Editor（1回でOK・再実行可）
--
-- 背景:
--   interview_photos は RLS 有効で anon の INSERT が拒否される設定だった。
--   casts も同様に anon INSERT が拒否される想定。
--   ただし管理画面は Supabase Auth ログイン済み = "authenticated" ロールで
--   動作するため、authenticated 向けポリシーを付ければ保存が機能する。
--
-- 方針:
--   【推奨】authenticated（ログイン済み管理者）に許可する。anon には開放しない。
--   料金・口座情報など機微データを扱うため anon 開放は避けるべき。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 【推奨】authenticated ロール向けポリシー
-- ---------------------------------------------------------------------
ALTER TABLE casts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS casts_select_auth ON casts;
CREATE POLICY casts_select_auth ON casts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS casts_insert_auth ON casts;
CREATE POLICY casts_insert_auth ON casts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS casts_update_auth ON casts;
CREATE POLICY casts_update_auth ON casts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 月別実績（詳細ページで参照。将来の登録・編集も見据えて）
ALTER TABLE cast_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cast_performance_select_auth ON cast_performance;
CREATE POLICY cast_performance_select_auth ON cast_performance
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cast_performance_insert_auth ON cast_performance;
CREATE POLICY cast_performance_insert_auth ON cast_performance
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS cast_performance_update_auth ON cast_performance;
CREATE POLICY cast_performance_update_auth ON cast_performance
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 【非推奨・代替】anon ロールに INSERT を許可する場合（未ログインでも書ける）
--   セキュリティ上おすすめしません。検証目的などで anon のまま試したい時のみ。
--   使う場合は下の3行のコメントを外してください。
-- ---------------------------------------------------------------------
-- DROP POLICY IF EXISTS casts_insert_anon ON casts;
-- CREATE POLICY casts_insert_anon ON casts
--   FOR INSERT TO anon WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 確認: casts に設定されているポリシー一覧
-- ---------------------------------------------------------------------
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('casts', 'cast_performance')
ORDER BY tablename, policyname;
