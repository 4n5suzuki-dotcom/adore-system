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
  status VARCHAR(50) DEFAULT 'incomplete',
  agreed_back_regulation_version VARCHAR(20),
  agreed_at TIMESTAMP,
  agreed_ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
