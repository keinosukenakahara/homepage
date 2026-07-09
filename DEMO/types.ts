// ============================================================
// 型定義
// ============================================================

export type UserRole = 'super_admin' | 'admin' | 'arranger' | 'staff'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  profile_id?: string
  employee_code?: string
  full_name: string
  email: string
  phone?: string
  role: 'admin' | 'arranger'
  department?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  profile_id?: string
  staff_code?: string
  full_name: string
  email: string
  phone?: string
  postal_code?: string
  address?: string
  invoice_number?: string
  bank_name?: string
  bank_branch?: string
  bank_account_type?: '普通' | '当座'
  bank_account_number?: string
  bank_account_holder?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
  // 関連データ
  projects?: Project[]
}

export interface Client {
  id: string
  client_name: string
  client_code?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id: string
  project_name: string
  project_code?: string
  abbreviation?: string
  work_description?: string
  work_description_notes?: string
  project_type: 'general' | 'delivery'
  is_active: boolean
  start_date?: string
  end_date?: string
  notes?: string
  created_at: string
  updated_at: string
  // 関連データ
  client?: Client
  unit_prices?: ProjectUnitPrice[]
}

export interface ProjectUnitPrice {
  id: string
  project_id: string
  item_name: string
  unit_price: number
  unit: string
  sort_order: number
  is_active: boolean
}

export interface Arrangement {
  id: string
  project_id: string
  staff_id: string
  work_date: string
  status: 'arranged' | 'confirmed' | 'completed' | 'cancelled'
  arranged_by?: string
  confirmed_at?: string
  notification_sent_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // 関連データ
  staff?: Staff
  project?: Project
}

export interface Report {
  id: string
  arrangement_id?: string
  project_id: string
  staff_id: string
  work_date: string
  status: 'draft' | 'submitted' | 'approved' | 'reconciled' | 'finalized'
  total_amount?: number
  submitted_by?: 'staff' | 'admin'
  submitted_at?: string
  approved_by?: string
  approved_at?: string
  finalized_by?: string
  finalized_at?: string
  reconciliation_note?: string
  notes?: string
  created_at: string
  updated_at: string
  // 関連データ
  items?: ReportItem[]
  staff?: Staff
  project?: Project
}

export interface ReportItem {
  id: string
  report_id: string
  unit_price_id: string
  item_name: string
  unit_price: number
  quantity: number
  amount: number
}

export interface PaymentNotice {
  id: string
  staff_id: string
  target_year: number
  target_month: number
  notice_type: 'combined' | 'per_project'
  status: 'provisional' | 'finalized'
  subtotal_amount?: number
  tax_amount?: number
  total_amount?: number
  pdf_url?: string
  issued_at?: string
  finalized_at?: string
  email_sent_at?: string
  created_by?: string
  notes?: string
  reconciliation_note?: string
  created_at: string
  updated_at: string
  // 関連データ
  staff?: Staff
  items?: PaymentNoticeItem[]
}

export interface PaymentNoticeItem {
  id: string
  payment_notice_id: string
  project_id?: string
  project_name: string
  work_date?: string
  item_name: string
  quantity?: number
  unit_price?: number
  amount: number
  sort_order: number
}

export interface AdvancePayment {
  id: string
  staff_id: string
  project_id?: string
  target_year: number
  target_month: number
  payment_date: string
  amount: number
  actual_payment_date?: string
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  confirmed_by?: string
  paid_by?: string
  pdf_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Deduction {
  id: string
  staff_id: string
  project_id?: string
  target_year: number
  target_month: number
  deduction_type: string
  amount: number
  notes?: string
  created_at: string
  updated_at: string
}

// APIレスポンス型
export interface ApiResponse<T> {
  data?: T
  error?: string
}

// 手配グリッド用
export interface ArrangementGridData {
  staffId: string
  staffName: string
  dates: { [date: string]: Arrangement | null }
}
