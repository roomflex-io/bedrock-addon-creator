create table if not exists wallets (
  user_id text primary key,
  coins integer not null default 12,
  grant_claimed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key,
  user_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on projects (user_id, updated_at desc);
