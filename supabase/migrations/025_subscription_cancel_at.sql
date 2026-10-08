-- Naplánované zrušení předplatného (Stripe cancel_at_period_end): do tohoto data má zákazník přístup.
alter table workspaces add column if not exists subscription_cancel_at timestamptz;
