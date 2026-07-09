-- ============================================================
-- 手配管理システム データベーススキーマ
-- Supabase (PostgreSQL) 用
-- ============================================================

-- 拡張機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. プロフィールテーブル（Supabase Auth連携）
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'arranger', 'staff')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. 社員テーブル（管理者・手配者）
-- ============================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'arranger')),
  department TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. スタッフテーブル（業務委託スタッフ）
-- ============================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  staff_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  postal_code TEXT,
  address TEXT,
  invoice_number TEXT,          -- インボイス番号 (T始まり)
  bank_name TEXT,               -- 銀行名
  bank_branch TEXT,             -- 支店名
  bank_account_type TEXT CHECK (bank_account_type IN ('普通', '当座')),
  bank_account_number TEXT,     -- 口座番号
  bank_account_holder TEXT,     -- 口座名義
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. クライアントテーブル
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  client_code TEXT UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. 案件テーブル
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  project_name TEXT NOT NULL,
  project_code TEXT UNIQUE,
  abbreviation TEXT,            -- 略称
  work_description TEXT,        -- 作業内容
  work_description_notes TEXT,  -- 作業内容補足
  project_type TEXT DEFAULT 'general' CHECK (project_type IN ('general', 'delivery')), -- 宅配案件フラグ
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. 案件単価テーブル
-- ============================================================
CREATE TABLE project_unit_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,      -- 商品名・項目名
  unit_price NUMERIC(10,2) NOT NULL,
  unit TEXT DEFAULT '件',       -- 単位
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. 案件スタッフ紐付け（担当案件）
-- ============================================================
CREATE TABLE project_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(project_id, staff_id)
);

-- ============================================================
-- 8. 手配テーブル
-- ============================================================
CREATE TABLE arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  work_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'arranged' CHECK (status IN (
    'arranged',     -- 手配済み
    'confirmed',    -- 本人承諾済み
    'completed',    -- 作業完了
    'cancelled'     -- キャンセル
  )),
  arranged_by UUID REFERENCES employees(id),    -- 手配した社員
  confirmed_at TIMESTAMPTZ,                     -- 承諾日時
  notification_sent_at TIMESTAMPTZ,             -- 手配メール送信日時
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, staff_id, work_date)
);

-- ============================================================
-- 9. レポートテーブル（仕事実績・件数）
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arrangement_id UUID REFERENCES arrangements(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  work_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',        -- 下書き（スタッフ入力中）
    'submitted',    -- 提出済み
    'approved',     -- 承認済み（仮確定）
    'reconciled',   -- 突合済み
    'finalized'     -- 確定
  )),
  total_amount NUMERIC(12,2),   -- 合計金額（自動計算）
  submitted_by TEXT CHECK (submitted_by IN ('staff', 'admin')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES employees(id),
  finalized_at TIMESTAMPTZ,
  reconciliation_note TEXT,     -- 突合時の修正備考
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. レポート明細テーブル（各単価ごとの件数）
-- ============================================================
CREATE TABLE report_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  unit_price_id UUID NOT NULL REFERENCES project_unit_prices(id) ON DELETE RESTRICT,
  item_name TEXT NOT NULL,      -- スナップショット（単価変更時の保護）
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. 支払通知書テーブル
-- ============================================================
CREATE TABLE payment_notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  notice_type TEXT NOT NULL DEFAULT 'combined' CHECK (notice_type IN ('combined', 'per_project')),
  status TEXT NOT NULL DEFAULT 'provisional' CHECK (status IN (
    'provisional',  -- 仮確定
    'finalized'     -- 確定
  )),
  subtotal_amount NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  pdf_url TEXT,                 -- Supabase Storage URL
  issued_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES employees(id),
  notes TEXT,
  reconciliation_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. 支払通知書明細テーブル
-- ============================================================
CREATE TABLE payment_notice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_notice_id UUID NOT NULL REFERENCES payment_notices(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,   -- スナップショット
  work_date DATE,
  item_name TEXT NOT NULL,
  quantity INTEGER,
  unit_price NUMERIC(10,2),
  amount NUMERIC(12,2) NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- 13. 前払いテーブル（宅配案件用）
-- ============================================================
CREATE TABLE advance_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL,
  payment_date DATE NOT NULL,       -- 入金希望日
  amount NUMERIC(12,2) NOT NULL,
  actual_payment_date DATE,         -- 実際の入金日
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 申請中
    'approved',     -- 承認済み
    'paid',         -- 入金済み
    'cancelled'     -- キャンセル
  )),
  confirmed_by UUID REFERENCES employees(id),  -- 確認者
  paid_by UUID REFERENCES employees(id),       -- 入金者
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. 控除テーブル（宅配案件用）
-- ============================================================
CREATE TABLE deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL,
  deduction_type TEXT NOT NULL,     -- ガソリン代, 車両費, ETC, 任意保険, etc.
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. 通知ログテーブル
-- ============================================================
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('staff', 'employee')),
  recipient_id UUID NOT NULL,
  notification_type TEXT NOT NULL,  -- arrangement, payment_notice, report_approved, etc.
  channel TEXT NOT NULL CHECK (channel IN ('email', 'line')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  reference_id UUID,                -- 関連レコードID
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX idx_arrangements_project_date ON arrangements(project_id, work_date);
CREATE INDEX idx_arrangements_staff_date ON arrangements(staff_id, work_date);
CREATE INDEX idx_reports_staff_month ON reports(staff_id, target_year, target_month) WHERE false; -- 仮
CREATE INDEX idx_reports_project_date ON reports(project_id, work_date);
CREATE INDEX idx_payment_notices_staff ON payment_notices(staff_id, target_year, target_month);
CREATE INDEX idx_project_staff_project ON project_staff(project_id);
CREATE INDEX idx_project_staff_staff ON project_staff(staff_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_payments ENABLE ROW LEVEL SECURITY;

-- スタッフは自分のデータのみ参照可能
CREATE POLICY "Staff can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff can view own staff record" ON staff
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Staff can view own arrangements" ON arrangements
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can view own reports" ON reports
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can insert own reports" ON reports
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can update own draft reports" ON reports
  FOR UPDATE USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "Staff can view own payment notices" ON payment_notices
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

CREATE POLICY "Staff can view own advance payments" ON advance_payments
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

-- 管理者・社員は全データアクセス可能
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'arranger'))
  );

-- ============================================================
-- 更新日時自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_arrangements_updated_at BEFORE UPDATE ON arrangements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payment_notices_updated_at BEFORE UPDATE ON payment_notices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_advance_payments_updated_at BEFORE UPDATE ON advance_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
