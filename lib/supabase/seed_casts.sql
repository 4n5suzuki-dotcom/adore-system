-- =====================================================================
-- 動作確認用：サンプルキャスト（3名）＋ 月別実績（各3か月）
-- 実行場所: Supabase ダッシュボード > SQL Editor（RLS をバイパスして実行されます）
-- tenant_id は .env.local の NEXT_PUBLIC_TENANT_ID（80f87308-...）
-- ※ 重複投入を避けるため「1回だけ」実行してください
--
-- 再実行したい場合は、先に下記で掃除してから流してください
-- （cast_performance は FK ON DELETE CASCADE で一緒に削除されます）:
--   DELETE FROM casts WHERE genshi_name LIKE 'テスト%';
-- =====================================================================

-- casts を3名 insert し、そのまま各キャストの月別実績を一括投入（id 手動コピー不要）
WITH new_casts AS (
  INSERT INTO casts
    (tenant_id, interview_id, genshi_name, furigana, age, contact_info, joined_date, status, memo)
  VALUES
    ('80f87308-b305-4d0c-8fb2-a7317e435a17', NULL, 'テスト花子', 'てすとはなこ',   25, '090-1111-1111', '2026-03-15', 'active', '優秀なキャスト'),
    ('80f87308-b305-4d0c-8fb2-a7317e435a17', NULL, 'テスト次郎', 'てすとじろう',   28, '090-2222-2222', '2026-02-20', 'active', '新人期間中'),
    ('80f87308-b305-4d0c-8fb2-a7317e435a17', NULL, 'テスト三郎', 'てすとさぶろう', 30, '090-3333-3333', '2026-01-10', 'trial',  '体験中のキャスト')
  RETURNING id, genshi_name
)
INSERT INTO cast_performance
  (cast_id, month, attendance_days, sales_total, back_earned)
SELECT nc.id, p.month, p.attendance_days, p.sales_total, p.back_earned
FROM new_casts nc
CROSS JOIN (VALUES
  ('2026-03', 18, 1200000, 360000),
  ('2026-04', 20, 1500000, 450000),
  ('2026-05', 16, 1100000, 330000)
) AS p(month, attendance_days, sales_total, back_earned)
RETURNING cast_id, month;

-- 確認1: 追加したキャストの id 一覧（詳細ページ /admin/casts/<id> で使用）
SELECT id, genshi_name, status
FROM casts
WHERE genshi_name LIKE 'テスト%'
ORDER BY created_at DESC;

-- 確認2: キャスト × 月別実績の突き合わせ（各キャスト3か月＝合計9行）
SELECT c.genshi_name, c.status, cp.month, cp.attendance_days, cp.sales_total, cp.back_earned
FROM casts c
JOIN cast_performance cp ON cp.cast_id = c.id
WHERE c.genshi_name LIKE 'テスト%'
ORDER BY c.genshi_name, cp.month DESC;
