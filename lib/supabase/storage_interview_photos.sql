-- =====================================================================
-- 面接（応募）写真用 Storage バケット ＆ ポリシー（顔写真＝機微情報）
-- 実行場所: Supabase ダッシュボード > SQL Editor（再実行可）
--
-- 設計:
--   - private バケット（public=false）。URL が漏れても無関係者は閲覧不可。
--   - anon（応募者・未ログイン）: アップロード(INSERT)のみ＝write-only。
--     SELECT/UPDATE/DELETE は付与しない（閲覧・上書き・削除を一切させない）。
--   - authenticated（ログイン管理者）: 署名URL生成のための SELECT のみ。
--   - 口座/個人情報を持つ interviews 本体とはバケットを分離。
--
-- 注意:
--   バケット作成はダッシュボード（Storage > New bucket, private）でも可。
--   その場合は下の INSERT をスキップし、File size limit=5MB /
--   Allowed MIME types= image/jpeg,image/png,image/webp を画面で設定する。
-- =====================================================================

-- 1) バケット作成（private・5MB上限・画像3形式のみ）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'interview-photos',
  'interview-photos',
  false,
  5242880, -- 5 * 1024 * 1024
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2) anon: アップロード(INSERT)のみ許可（write-only）
drop policy if exists interview_photos_obj_insert_anon on storage.objects;
create policy interview_photos_obj_insert_anon on storage.objects
  for insert to anon
  with check (bucket_id = 'interview-photos');

-- 3) authenticated（管理者）: 署名URL生成のための SELECT のみ
drop policy if exists interview_photos_obj_select_auth on storage.objects;
create policy interview_photos_obj_select_auth on storage.objects
  for select to authenticated
  using (bucket_id = 'interview-photos');

-- ※ anon の SELECT/UPDATE/DELETE ポリシーは意図的に作成しない（閲覧・改ざん不可）

-- 確認: このバケットに対するポリシー一覧
-- SELECT policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND policyname LIKE 'interview_photos_obj_%'
-- ORDER BY policyname;
