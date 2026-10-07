-- Fakturační měna workspace (CZK nebo EUR). Stávající workspace zůstávají v CZK.
alter table workspaces
  add column if not exists currency text not null default 'CZK'
    check (currency in ('CZK', 'EUR'));
