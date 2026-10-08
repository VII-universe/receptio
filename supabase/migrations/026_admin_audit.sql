-- Audit log akcí administrátora (změna plánu, reset minut, pozastavení hovorů, prodloužení trialu).
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id text not null,                          -- Clerk user ID
  workspace_id uuid references workspaces(id) on delete set null,
  action text not null,                                 -- 'set_plan', 'reset_minutes', 'toggle_calls_paused', 'extend_trial'
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index on admin_audit_log(workspace_id);
create index on admin_audit_log(created_at desc);

-- Stejně jako ostatní tabulky: RLS zapnuté, přístup jen přes service role na serveru.
alter table admin_audit_log enable row level security;

-- Přehled pro /dashboard/admin jedním dotazem (agregace v databázi, ne stahování všech workspace).
create or replace function admin_overview_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'workspaces', count(*),
    'paid', count(*) filter (where plan <> 'free'),
    'trials', count(*) filter (where plan = 'free' and trial_ends_at > now()),
    'minutes', coalesce(sum(minutes_used) filter (where billing_period_end is null or billing_period_end > now()), 0),
    'paused', count(*) filter (where calls_paused),
    'paid_by_plan', (
      select coalesce(jsonb_agg(jsonb_build_object('currency', currency, 'plan', plan, 'count', n)), '[]'::jsonb)
      from (
        select currency, plan, count(*) as n
        from public.workspaces
        where plan <> 'free' and plan_status not in ('canceled', 'unpaid', 'incomplete_expired')
        group by currency, plan
      ) t
    )
  )
  from public.workspaces;
$$;

revoke all on function admin_overview_stats() from public, anon, authenticated;
grant execute on function admin_overview_stats() to service_role;
