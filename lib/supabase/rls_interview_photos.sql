-- =====================================================================
-- interview_photos テーブルの RLS ポリシー（顔写真メタデータ）
-- 実行場所: Supabase ダッシュボード > SQL Editor（再実行可）
--
-- 背景:
--   従来 interview_photos は RLS 有効で anon INSERT が拒否されていた。
--   応募フォーム(/interview)は anon ロールで動くため、写真メタの保存には
--   anon INSERT を「書き込みのみ」で許可する必要がある。
--
-- 設計（write-only / 閲覧は管理者のみ）:
--   - anon: INSERT のみ許可（SELECT は付与しない＝応募者は他人含め閲覧不可）。
--           photo_num は 1〜3 のみ受け付ける（CHECK で軽い妥当性確認）。
--   - authenticated（管理者）: SELECT のみ（詳細ページで一覧表示）。
--
-- 注意:
--   既存テーブル定義・interviews 本体の RLS は変更しない（破壊的変更なし）。
--   テーブルが本番に未作成の場合は schema.sql の CREATE を先に適用すること。
-- =====================================================================

alter table interview_photos enable row level security;

-- anon: メタデータの INSERT のみ（write-only）。photo_num は 1〜3。
drop policy if exists interview_photos_insert_anon on interview_photos;
create policy interview_photos_insert_anon on interview_photos
  for insert to anon
  with check (photo_num between 1 and 3);

-- authenticated（管理者）: 閲覧（SELECT）のみ
drop policy if exists interview_photos_select_auth on interview_photos;
create policy interview_photos_select_auth on interview_photos
  for select to authenticated
  using (true);

-- ※ anon の SELECT は意図的に作成しない（応募者は写真を一切閲覧できない）

-- 確認: interview_photos のRLS状態とポリシー一覧
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'interview_photos';
-- SELECT policyname, cmd, roles FROM pg_policies
-- WHERE tablename = 'interview_photos' ORDER BY policyname;
