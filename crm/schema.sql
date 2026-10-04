begin;
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null,
  source_key text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  event_type text not null check (event_type in ('corporate','wedding','private','bar-mitzvah','birthday','other')),
  event_date date,
  event_location text,
  guest_count integer check (guest_count between 1 and 100000),
  message text not null,
  language text check (language in ('en','he')),
  source text not null default 'website',
  status text not null default 'new' check (status in ('new','contacted','quote_sent','booked','completed','lost')),
  quoted_price numeric(12,2) check (quoted_price >= 0),
  agreed_price numeric(12,2) check (agreed_price >= 0),
  currency text not null default 'ILS',
  last_contact_at timestamptz,
  next_followup_at timestamptz,
  notes text
);
create index leads_followup_idx on public.leads(next_followup_at) where status not in ('completed','lost');
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant select, insert, update, delete on public.leads to service_role;
-- Deliberately no public or authenticated policies. Owner access via Supabase dashboard
-- initially; a later private CRM needs explicit owner-only authorization.
commit;
