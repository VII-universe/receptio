export type Industry =
  | 'restaurant'
  | 'dentist'
  | 'hair_salon'
  | 'auto_repair'
  | 'veterinary'
  | 'law_firm'
  | 'fitness'
  | 'other'

export interface Workspace {
  id: string
  clerk_user_id: string
  name: string
  industry: Industry
  website_url: string | null
  address: string | null
  notification_email: string | null
  notification_phone: string | null
  notifications_enabled: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'free' | 'starter' | 'business' | 'pro'
  plan_status: string
  minutes_used: number
  minutes_limit: number // -1 = neomezeno
  billing_period_start: string | null
  billing_period_end: string | null
  created_at: string
  updated_at: string
}

export interface DayHours {
  open: boolean
  from: string // "09:00"
  to: string // "18:00"
}

export interface BusinessHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export interface FaqItem {
  question: string
  answer: string
}

export interface Agent {
  id: string
  workspace_id: string
  name: string
  vapi_agent_id: string | null
  phone_number: string | null
  phone_number_sid: string | null
  vapi_phone_number_id: string | null
  language: 'cs' | 'sk' | 'en'
  is_active: boolean
  business_hours: BusinessHours
  fallback_phone: string | null
  notification_email: string | null
  notification_phone: string | null
  greeting_message: string | null
  faq: FaqItem[]
  custom_instructions: string | null
  created_at: string
  updated_at: string
}

export interface CallLog {
  id: string
  agent_id: string
  workspace_id: string
  vapi_call_id: string
  caller_number: string | null
  duration_seconds: number
  status: 'completed' | 'missed' | 'transferred' | 'failed' | 'in_progress'
  summary: string | null
  transcript: string | null
  recording_url: string | null
  cost_cents: number
  ended_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Subscription {
  id: string
  workspace_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'starter' | 'business' | 'pro'
  status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'incomplete'
  minutes_included: number
  minutes_used: number
  current_period_start: string | null
  current_period_end: string | null
  trial_end: string | null
  created_at: string
  updated_at: string
}

export interface IndustryTemplate {
  id: string
  industry: Industry
  language: 'cs' | 'sk' | 'en'
  name: string
  greeting_message: string
  custom_instructions: string
  faq: FaqItem[]
  is_default: boolean
  created_at: string
}
