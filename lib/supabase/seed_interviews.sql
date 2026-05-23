-- =====================================================================
-- 営業プレゼン用サンプル面接データ（10件）
-- 実行場所: Supabase ダッシュボード > SQL Editor
-- tenant_id は .env.local の NEXT_PUBLIC_TENANT_ID を埋め込み済み
--   (80f87308-b305-4d0c-8fb2-a7317e435a17)
-- ※ email/phone に UNIQUE 制約は無いため、重複投入を避けるため「1回だけ」実行してください
-- ステータス分布: incomplete 2 / pending 2 / confirmed 2 / hired 3 / rejected 1
-- =====================================================================

INSERT INTO interviews
  (tenant_id, genshi_name, furigana, age, email, phone, status, created_at, updated_at)
VALUES
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', 'テスト太郎', 'てすとたろう',   25, 'test1@example.com',  '09012345601', 'hired',      NOW() - INTERVAL '20 days',  NOW() - INTERVAL '20 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '山田花子',   'やまだはなこ',   28, 'test2@example.com',  '09012345602', 'hired',      NOW() - INTERVAL '15 days',  NOW() - INTERVAL '15 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '佐藤由美',   'さとうゆみ',     23, 'test3@example.com',  '09012345603', 'hired',      NOW() - INTERVAL '10 days',  NOW() - INTERVAL '10 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '田中美咲',   'たなかみさき',   27, 'test4@example.com',  '09012345604', 'confirmed',  NOW() - INTERVAL '8 days',   NOW() - INTERVAL '8 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '鈴木朝子',   'すずきあさこ',   22, 'test5@example.com',  '09012345605', 'confirmed',  NOW() - INTERVAL '5 days',   NOW() - INTERVAL '5 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '伊藤夏子',   'いとうなつこ',   29, 'test6@example.com',  '09012345606', 'pending',    NOW() - INTERVAL '3 days',   NOW() - INTERVAL '3 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '高橋結衣',   'たかはしゆい',   21, 'test7@example.com',  '09012345607', 'pending',    NOW() - INTERVAL '2 days',   NOW() - INTERVAL '2 days'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '鎌田杏果',   'かまだきょうか', 24, 'test8@example.com',  '09012345608', 'incomplete', NOW() - INTERVAL '1 day',    NOW() - INTERVAL '1 day'),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '矢野美月',   'やのみづき',     26, 'test9@example.com',  '09012345609', 'incomplete', NOW(),                       NOW()),
  ('80f87308-b305-4d0c-8fb2-a7317e435a17', '吉田春奈',   'よしだはるな',   30, 'test10@example.com', '09012345610', 'rejected',   NOW() - INTERVAL '30 hours', NOW() - INTERVAL '30 hours');

-- 確認用:
-- SELECT status, COUNT(*) FROM interviews GROUP BY status ORDER BY status;
