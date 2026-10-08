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
  clerk_org_id: string | null
  name: string
  industry: Industry
  website_url: string | null
  address: string | null
  notification_email: string | null
  notification_phone: string | null
  notifications_enabled: boolean
  logo_url?: string | null
  onboarding_completed: boolean
  business_type: string | null
  business_name: string | null
  timezone: string
  currency: 'CZK' | 'EUR'
  locale: string // jazyk rozhraní dashboardu
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'free' | 'starter' | 'business' | 'pro'
  plan_status: string
  minutes_used: number
  minutes_limit: number // -1 = neomezeno
  billing_period_start: string | null
  billing_period_end: string | null
  calls_paused: boolean
  trial_ends_at: string | null
  trial_used: boolean
  overage_subscription_item_id: string | null
  overage_minutes_reported: number
  subscription_cancel_at: string | null
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
  phone_number_id: string | null
  language: string // kód z lib/languages.ts (cs, de, de-AT, ...)
  language_name: string
  is_active: boolean
  business_hours: BusinessHours
  fallback_phone: string | null
  notification_email: string | null
  notification_phone: string | null
  greeting_message: string | null
  faq: FaqItem[]
  custom_instructions: string | null
  voice_id: string | null
  system_prompt: string | null
  end_call_phrases: string[]
  knowledge_synced_at: string | null
  timezone: string
  outside_hours_message: string | null
  rings_before_answer: number
  ai_disclosure_enabled: boolean
  max_call_duration_minutes: number | null
  booking_enabled: boolean
  booking_auto_confirm: boolean
  booking_notify_customer: boolean
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
  transcript_json: TranscriptMessage[] | null
  started_at: string | null
  ended_at: string | null
  cost: number | null // USD
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

export interface PhoneNumber {
  id: string
  workspace_id: string
  agent_id: string | null
  twilio_sid: string
  vapi_phone_number_id: string | null
  phone_number: string
  friendly_name: string | null
  is_active: boolean
  monthly_cost: number | null
  cost_currency: string
  purchased_at: string
}

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system'
  message: string
  time: number // epoch ms
  secondsFromStart: number
}

export type KnowledgeCategory = 'basic_info' | 'hours' | 'services' | 'faq' | 'custom'

export interface KnowledgeEntry {
  id: string
  agent_id: string
  workspace_id: string
  category: KnowledgeCategory
  title: string
  content: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface WorkingHour {
  day_of_week: number // 0 = neděle, 1 = pondělí ... 6 = sobota
  is_open: boolean
  open_time: string | null // HH:MM, null = celý den
  close_time: string | null
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Booking {
  id: string
  agent_id: string
  workspace_id: string
  external_id: string | null
  calendar_connection_id: string | null
  caller_name: string
  caller_phone: string | null
  starts_at: string
  ends_at: string
  title: string
  notes: string | null
  status: BookingStatus
  confirmed_at: string | null
  cancelled_at: string | null
  call_log_id: string | null
  created_at: string
}

export type CalendarProvider = 'google' | 'ical' | 'caldav'

/** Napojení kalendáře bez citlivé konfigurace (tokeny, hesla, URL se klientovi nikdy neposílají). */
export interface CalendarConnection {
  id: string
  workspace_id: string
  provider: CalendarProvider
  name: string
  sync_enabled: boolean
  last_synced_at: string | null
  last_sync_error: string | null
  created_at: string
}

export interface AvailabilitySlot {
  id: string
  agent_id: string
  workspace_id: string
  day_of_week: number | null
  date: string | null
  start_time: string
  end_time: string
  slot_duration_minutes: number
  is_available: boolean
  note: string | null
  external_source: string | null
}
