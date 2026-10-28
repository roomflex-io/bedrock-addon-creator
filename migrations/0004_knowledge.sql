create table if not exists feature_modules (
  id uuid primary key default gen_random_uuid(),
  edition text not null,
  minecraft_version text not null,
  name text not null,
  category text not null,
  description text not null,
  intent_examples text[] not null default '{}',
  tags text[] not null default '{}',
  dependencies jsonb not null default '[]',
  conflicts jsonb not null default '[]',
  status text not null default 'experimental',
  verified boolean not null default false,
  usage_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  success_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition, name)
);

create table if not exists generation_frameworks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition text not null,
  minecraft_version text not null,
  creation_type text not null,
  base_type text not null,
  description text not null,
  capabilities text[] not null default '{}',
  tags text[] not null default '{}',
  required_modules jsonb not null default '[]',
  optional_modules jsonb not null default '[]',
  usage_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  success_rate numeric not null default 0,
  verified boolean not null default false,
  version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edition, name)
);

create table if not exists generation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id text,
  edition text not null,
  minecraft_version text not null,
  original_prompt text not null,
  interpreted_intent jsonb not null default '{}',
  selected_framework text,
  retrieved_modules text[] not null default '{}',
  final_status text not null,
  coin_cost integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists feature_modules_tags_idx on feature_modules using gin (tags);
create index if not exists generation_frameworks_tags_idx on generation_frameworks using gin (tags);

alter table feature_modules enable row level security;
alter table generation_frameworks enable row level security;
alter table generation_runs enable row level security;

insert into generation_frameworks
  (name, edition, minecraft_version, creation_type, base_type, description, capabilities, tags, verified, success_count, usage_count, success_rate)
values
  ('basic_humanoid', 'bedrock', '1.21', 'mob', 'humanoid', 'Working ground humanoid: body, arms, legs, melee or ranged attack.', array['walk','melee','ranged'], array['golem','villager','zombie','humanoid','boss'], true, 40, 40, 0.98),
  ('basic_dragon', 'bedrock', '1.21', 'mob', 'dragon', 'Working flying dragon: wings, breath attack, keep flight when adapting.', array['fly','projectile'], array['dragon','wyvern','fly','breath'], true, 36, 37, 0.97),
  ('basic_beast', 'bedrock', '1.21', 'mob', 'beast', 'Working four-legged mob.', array['walk','melee'], array['wolf','beast','bear','cat'], true, 20, 21, 0.95),
  ('basic_weapon', 'bedrock', '1.21', 'weapon', 'blade', 'Working held weapon.', array['damage'], array['sword','blade','axe'], true, 12, 12, 0.99),
  ('lava_golem_v1', 'bedrock', '1.21', 'mob', 'humanoid', 'Verified lava golem: furnace chest, fireball, nether spawn. Adapt this instead of a new golem.', array['projectile','nether','giant'], array['lava','golem','fireball','basalt'], true, 18, 18, 0.99)
on conflict (edition, name) do nothing;

insert into feature_modules
  (name, edition, minecraft_version, category, description, intent_examples, tags, status, verified, success_count, usage_count, success_rate)
values
  ('ranged_projectile', 'bedrock', '1.21', 'attack', 'Shoots a projectile on a cooldown. Adapt the projectile, do not invent a second shooter.', array['throws fireballs','breathes ice','spits lava'], array['fireball','projectile','breath','snowball','lava'], 'verified', true, 50, 51, 0.98),
  ('melee_attack', 'bedrock', '1.21', 'attack', 'Hits nearby players.', array['bites','punches','slashes'], array['melee','bite','punch'], 'verified', true, 30, 31, 0.97),
  ('summon_minions', 'bedrock', '1.21', 'attack', 'Summons a vanilla mob.', array['summons skeletons','calls zombies'], array['summon','minion','skeleton','zombie'], 'verified', true, 14, 16, 0.88),
  ('custom_loot', 'bedrock', '1.21', 'loot', 'Drops named items.', array['drops a sword','drops emeralds'], array['drop','loot','sword'], 'verified', true, 22, 23, 0.96),
  ('giant_scale', 'bedrock', '1.21', 'appearance', 'Makes the creation larger. Only changes scale.', array['giant','huge','massive'], array['giant','huge','scale'], 'verified', true, 19, 19, 0.99)
on conflict (edition, name) do nothing;
