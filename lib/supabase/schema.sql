-- テナント（店舗）
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  plan VARCHAR(20) DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

-- バック規定
CREATE TABLE IF NOT EXISTS back_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255),
  content TEXT,
  effective_from DATE,
  effective_to DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ロール権限
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  permission_key VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, role, permission_key)
);

-- 面接シート
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  genshi_name VARCHAR(255),
  furigana VARCHAR(255),
  gender VARCHAR(10),
  birthdate DATE,
  age INT,
  email VARCHAR(255),
  phone VARCHAR(20),
  line_id VARCHAR(255),
  address TEXT,
  address_detail TEXT,
  live_alone BOOLEAN,
  roommate_info TEXT,
  memo TEXT,
  status VARCHAR(50) DEFAULT 'incomplete',
  agreed_back_regulation_version VARCHAR(20),
  agreed_at TIMESTAMP,
  agreed_ip VARCHAR(45),
  -- 振込先情報
  bank_name VARCHAR(255),
  branch_name VARCHAR(255),
  account_type VARCHAR(20),
  account_number VARCHAR(20),
  account_name VARCHAR(255),
  -- アンケート回答（応募フォームの選択式）
  source_channel VARCHAR(50),
  -- scout_company は自由記載（スタッフが管理画面で入力）。TEXT 運用。
  scout_company TEXT,
  application_reason VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 既存DB向けマイグレーション：振込先情報カラムを追加（新規作成時は上の定義で作成済み）
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS account_type VARCHAR(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS account_name VARCHAR(255);

-- 既存DB向けマイグレーション：再アプローチ（再連絡記録）カラムを追加
-- 詳細は lib/supabase/migration_followups.sql を参照
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMP;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS followup_count INT DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_interviews_last_followup_at ON interviews(last_followup_at);

-- 既存DB向けマイグレーション：アンケート回答カラムを追加
-- 詳細は lib/supabase/migration_survey_fields.sql を参照
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS source_channel VARCHAR(50);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS scout_company VARCHAR(50);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS application_reason VARCHAR(50);

-- 既存DB向け：scout_company を自由記載対応で TEXT へ拡張（非破壊）
-- 詳細は lib/supabase/migration_scout_widen.sql を参照
ALTER TABLE interviews ALTER COLUMN scout_company TYPE TEXT;

-- 面接履歴
CREATE TABLE IF NOT EXISTS interviews_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  edited_by UUID,
  changed_field VARCHAR(255),
  old_value TEXT,
  new_value TEXT,
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 面接写真
-- ※ photo_url には Supabase Storage（private バケット interview-photos）の
--    パスを格納する。バケット作成・ポリシーは storage_interview_photos.sql、
--    本テーブルの RLS（anon INSERT / authenticated SELECT）は
--    rls_interview_photos.sql を参照（本番で別途実行）。
--    既存シードの外部URL（http始まり）は管理画面でパススルー表示される。
CREATE TABLE IF NOT EXISTS interview_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  photo_num INT,
  photo_url TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 面接書類
CREATE TABLE IF NOT EXISTS interview_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  document_type VARCHAR(100),
  document_url TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- リマインダー
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  contact_method VARCHAR(20),
  phone_or_line_id VARCHAR(255),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  recipient_user_id UUID,
  notification_type VARCHAR(100),
  message TEXT,
  status VARCHAR(20),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャスト
CREATE TABLE IF NOT EXISTS casts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES interviews(id),
  genshi_name VARCHAR(255),
  furigana VARCHAR(255),
  age INT,
  contact_info VARCHAR(255),
  joined_date DATE,
  retirement_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  new_days INT DEFAULT 30,
  photo_url TEXT,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャスト稼働状況
CREATE TABLE IF NOT EXISTS cast_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id UUID NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  month VARCHAR(7),
  attendance_days INT,
  sales_total NUMERIC(10, 2),
  back_earned NUMERIC(10, 2),
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cast_id, month)
);

-- 顧客
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_number VARCHAR(50) UNIQUE,
  name VARCHAR(255),
  contact_info VARCHAR(255),
  first_visit DATE,
  visit_count INT DEFAULT 0,
  total_spending NUMERIC(10, 2) DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャスト顧客関係
CREATE TABLE IF NOT EXISTS cast_customer_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id UUID NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visit_count INT DEFAULT 0,
  last_visit_date DATE,
  first_visit_date DATE,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cast_id, customer_id)
);

-- シフトスケジュール（キャスト稼働スケジュール）
CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cast_id UUID NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 同一キャストは同じ日に1件のみ登録可
  UNIQUE(cast_id, shift_date)
);

-- shift_schedules のインデックス
-- （PostgreSQL では CREATE TABLE 内のインライン INDEX 定義が使えないため別文で作成）
CREATE INDEX IF NOT EXISTS idx_shift_schedules_cast_id ON shift_schedules(cast_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_shift_date ON shift_schedules(shift_date);

-- RLS（開発中は無効。本番では casts 同様 authenticated 向けポリシーを推奨）
ALTER TABLE shift_schedules DISABLE ROW LEVEL SECURITY;

-- シフト申告アクセストークン（キャスト向けシフト申告URL管理）
CREATE TABLE IF NOT EXISTS shift_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id UUID NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  token VARCHAR(32) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shift_access_tokens のインデックス
CREATE INDEX IF NOT EXISTS idx_shift_access_tokens_token ON shift_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_shift_access_tokens_cast_id ON shift_access_tokens(cast_id);

-- RLS（開発中は無効。本番ではトークン検証API経由のアクセス制御を推奨）
ALTER TABLE shift_access_tokens DISABLE ROW LEVEL SECURITY;

-- シフト変更依頼（キャストからの稼働時間変更リクエストと承認管理）
CREATE TABLE IF NOT EXISTS shift_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id UUID NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  old_start_time TIME,
  old_end_time TIME,
  new_start_time TIME,
  new_end_time TIME,
  request_reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending / approved / rejected
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shift_change_requests のインデックス
CREATE INDEX IF NOT EXISTS idx_shift_change_requests_cast_id ON shift_change_requests(cast_id);
CREATE INDEX IF NOT EXISTS idx_shift_change_requests_status ON shift_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_change_requests_shift_date ON shift_change_requests(shift_date);

-- RLS（開発中は無効。本番では casts 同様 authenticated 向けポリシーを推奨）
ALTER TABLE shift_change_requests DISABLE ROW LEVEL SECURITY;

-- シフト申告（キャスト申告 → 管理側が確定版に調整するフロー）
CREATE TABLE IF NOT EXISTS shift_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id UUID NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) DEFAULT 'submitted', -- submitted / confirmed
  confirmed_start_time TIME,
  confirmed_end_time TIME,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 同一キャストは同じ日に1件のみ（再申告は upsert で上書き）
  UNIQUE(cast_id, shift_date)
);

-- shift_submissions のインデックス
CREATE INDEX IF NOT EXISTS idx_shift_submissions_cast_id ON shift_submissions(cast_id);
CREATE INDEX IF NOT EXISTS idx_shift_submissions_status ON shift_submissions(status);
CREATE INDEX IF NOT EXISTS idx_shift_submissions_shift_date ON shift_submissions(shift_date);

-- RLS（開発中は無効。本番では casts 同様 authenticated 向けポリシーを推奨）
ALTER TABLE shift_submissions DISABLE ROW LEVEL SECURITY;

-- インデックス作成
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_interviews_tenant_id ON interviews(tenant_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_created_at ON interviews(created_at);
CREATE INDEX idx_casts_tenant_id ON casts(tenant_id);
CREATE INDEX idx_casts_status ON casts(status);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_cast_performance_cast_id ON cast_performance(cast_id);
CREATE INDEX idx_cast_performance_month ON cast_performance(month);

-- フィーチャーフラグ管理テーブル（各機能の ON/OFF・フェーズを制御。rollout_percentage は廃止）
DROP TABLE IF EXISTS feature_flags CASCADE;

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  phase INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PostgreSQL ではインライン COMMENT が使えないため、列コメントは別文で付与
COMMENT ON COLUMN feature_flags.phase IS '1=フェーズ1, 2=フェーズ2, 3=フェーズ3';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);

-- RLS 無効化（開発中）
ALTER TABLE feature_flags DISABLE ROW LEVEL SECURITY;

-- 初期データ挿入（ON/OFF のみ。実装済み=true / 未実装=false）
INSERT INTO feature_flags (key, name, description, enabled, phase) VALUES
  ('interview_management', '面接管理', '面接管理機能', true, 1),
  ('interview_reminders', '面接リマインダ', 'リマインダー機能', true, 1),
  ('memo_system', 'メモ・申し送り', 'メモ編集機能', true, 1),
  ('status_notifications', 'ステータス通知', 'ステータス変更通知', true, 1),
  ('ai_support', 'AI経営サポート', 'Claude API統合', false, 2),
  ('customer_management', '顧客管理', '会員管理機能', true, 2),
  ('dashboard_kpi', 'ダッシュボードKPI', 'ダッシュボード（KPI）', true, 2),
  ('salary_calculation', '給与計算エンジン', '給与自動計算', false, 2),
  ('sales_analytics', '売上分析', '売上分析ダッシュボード', true, 2),
  ('sales_management', '売上管理', '売上分析・管理', false, 2),
  ('shift_calendar', '稼働カレンダー', '稼働カレンダー機能', true, 2),
  ('shift_self_report', 'シフト自己申告', 'シフト自己申告システム', true, 2)
ON CONFLICT (key) DO NOTHING;
