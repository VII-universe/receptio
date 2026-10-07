-- NENÍ APLIKOVÁNO (čeká na schválení): sjednocení uložených limitů minut s PLAN_LIMITS
-- (src/lib/billing/plans.ts) u stávajících workspaces a pozastavení těch, které už limit překročily.
update workspaces
set minutes_limit = case plan
  when 'starter' then 100
  when 'business' then 500
  when 'pro' then 2000
  else 0
end;

update workspaces
set calls_paused = true
where minutes_limit <> -1
  and (billing_period_end is null or billing_period_end > now())
  and minutes_used >= minutes_limit;
