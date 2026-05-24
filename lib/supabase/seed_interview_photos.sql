-- =====================================================================
-- 動作確認用：応募者写真のサンプルデータ（1面接につき3枚）
-- 実行場所: Supabase ダッシュボード > SQL Editor
--   ※ SQL Editor は RLS をバイパスして実行されるため insert 可能です
-- interview_photos には tenant_id 列は無い（interviews への FK のみ）
-- ※ 重複投入を避けるため「1回だけ」実行してください
-- 画像URL: placehold.co を使用（via.placeholder.com は 2024 年に停止済み）
-- =====================================================================

-- 最も古い interview 1件に対して、photo_num 1〜3 の写真を一括 insert
INSERT INTO interview_photos (interview_id, photo_num, photo_url, uploaded_at)
SELECT
  i.id,
  p.n,
  'https://placehold.co/300x400?text=Photo+' || p.n,
  NOW()
FROM (SELECT id FROM interviews ORDER BY created_at LIMIT 1) AS i
CROSS JOIN generate_series(1, 3) AS p(n);

-- 確認1: どの interview に写真が付いたか（この id で詳細ページを開く）
--   → /admin/interviews/<id>
SELECT id AS interview_id, genshi_name
FROM interviews
ORDER BY created_at
LIMIT 1;

-- 確認2: 追加された3行を表示
SELECT interview_id, photo_num, photo_url, uploaded_at
FROM interview_photos
ORDER BY uploaded_at DESC, photo_num
LIMIT 3;
