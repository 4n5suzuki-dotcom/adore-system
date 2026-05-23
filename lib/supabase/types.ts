export interface Tenant {
  id: string
  name: string
  address: string
  phone: string
  email: string
  plan: 'basic' | 'standard' | 'premium'
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  password_hash: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  name: string
  phone: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface BackRegulation {
  id: string
  tenant_id: string
  version: string
  title: string
  content: string
  effective_from: string
  effective_to: string | null
  created_by: string
  created_at: string
}

export interface RolePermission {
  id: string
  tenant_id: string
  role: string
  permission_key: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface Interview {
  id: string
  tenant_id: string
  genshi_name: string
  furigana: string
  gender: string | null
  birthdate: string | null
  age: number | null
  email: string
  phone: string
  line_id: string | null
  address: string | null
  address_detail: string | null
  live_alone: boolean | null
  roommate_info: string | null
  memo: string | null
  status: 'incomplete' | 'pending' | 'confirmed' | 'processing' | 'hired' | 'rejected' | 'on_trial'
  agreed_back_regulation_version: string | null
  agreed_at: string | null
  agreed_ip: string | null
  created_at: string
  updated_at: string
}

export interface InterviewHistory {
  id: string
  interview_id: string
  edited_by: string
  changed_field: string
  old_value: string | null
  new_value: string | null
  edited_at: string
}

export interface InterviewPhoto {
  id: string
  interview_id: string
  photo_num: number
  photo_url: string
  uploaded_at: string
}

export interface InterviewDocument {
  id: string
  interview_id: string
  document_type: string
  document_url: string
  uploaded_at: string
}

export interface ScheduledReminder {
  id: string
  tenant_id: string
  interview_id: string
  reminder_type: string
  scheduled_at: string
  sent_at: string | null
  status: 'pending' | 'sent' | 'failed'
  contact_method: 'LINE' | 'SMS' | 'EMAIL'
  phone_or_line_id: string
  message: string
  created_at: string
}

export interface Notification {
  id: string
  tenant_id: string
  interview_id: string
  recipient_user_id: string
  notification_type: string
  message: string
  status: string
  sent_at: string | null
  created_at: string
}

export interface Cast {
  id: string
  tenant_id: string
  interview_id: string | null
  genshi_name: string
  furigana: string
  age: number
  contact_info: string
  joined_date: string
  retirement_date: string | null
  status: 'active' | 'trial' | 'retired'
  new_days: number
  photo_url: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export interface CastPerformance {
  id: string
  cast_id: string
  month: string
  attendance_days: number
  sales_total: number
  back_earned: number
  memo: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  member_number: string
  name: string
  contact_info: string
  first_visit: string | null
  visit_count: number
  total_spending: number
  memo: string | null
  created_at: string
}

export interface CastCustomerRelation {
  id: string
  cast_id: string
  customer_id: string
  visit_count: number
  last_visit_date: string | null
  first_visit_date: string
  memo: string | null
  created_at: string
}

// フィーチャーフラグ
export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  rollout_percentage: number
  phase: number
  created_at: string
  updated_at: string
}
