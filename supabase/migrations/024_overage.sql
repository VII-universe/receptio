-- Overage (minuty nad limit plánu) účtované přes Stripe metered billing.
-- overage_subscription_item_id: položka předplatného s metered cenou (jen předplatné, které ji obsahuje, smí překročit limit);
-- overage_minutes_reported: kolik minut nad limit už bylo v aktuálním období nahlášeno do Stripe (nuluje se s novým obdobím).
alter table workspaces
  add column if not exists overage_subscription_item_id text,
  add column if not exists overage_minutes_reported integer not null default 0;
