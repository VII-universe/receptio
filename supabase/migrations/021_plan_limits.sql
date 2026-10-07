-- Vynucování limitů plánů: příznak pozastavených hovorů a čas posledního resetu spotřeby.
-- Počítadlo minut zůstává ve stávajícím sloupci minutes_used (období řeší billing_period_*, viz 005).
alter table workspaces
  add column if not exists calls_paused boolean not null default false,
  add column if not exists minutes_reset_at timestamptz;
