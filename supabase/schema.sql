create extension if not exists pgcrypto;

-- Rituales
create table if not exists rituals (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  user_id        uuid references auth.users(id) on delete set null,
  title          text,
  ritual_type    text,
  intention      text,
  intention_category text,
  energy         text,
  element        text,
  duration       integer,
  intensity      text,
  anchor         text,
  ai_ritual      jsonb,
  guided_session jsonb,
  audio_url      text,
  audio_completed_at timestamptz,
  anchor_confirmed_at timestamptz,
  reflection_text text
);

alter table rituals add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table rituals add column if not exists title text;
alter table rituals add column if not exists intention_category text;
alter table rituals add column if not exists ai_ritual jsonb;
alter table rituals add column if not exists guided_session jsonb;
alter table rituals add column if not exists audio_url text;
alter table rituals add column if not exists audio_completed_at timestamptz;
alter table rituals add column if not exists anchor_confirmed_at timestamptz;
alter table rituals add column if not exists reflection_text text;

-- Favoritos del usuario
create table if not exists ritual_favorites (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  ritual_id  uuid not null references rituals(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  unique (ritual_id, user_id)
);

-- Likes del usuario
create table if not exists ritual_likes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  ritual_id  uuid not null references rituals(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  unique (ritual_id, user_id)
);

-- Eventos de analytics
create table if not exists events (
  id         bigserial primary key,
  created_at timestamptz default now(),
  event      text not null,
  ts         timestamptz,
  props      jsonb default '{}'::jsonb
);

-- Carta del Oráculo del día (una por persona por día)
create table if not exists daily_intention_cards (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date_key       text not null,
  intention_text text not null,
  feeling        text,
  unique (user_id, date_key)
);

-- Oráculo del día: carta del mazo curado (src/lib/oracle-deck.js), lo que contó
-- la persona (input_text), la intención reencuadrada y el gesto personalizado
alter table daily_intention_cards add column if not exists card_id text;
alter table daily_intention_cards add column if not exists gesture text;
alter table daily_intention_cards add column if not exists input_text text;

alter table daily_intention_cards enable row level security;

drop policy if exists "Users manage their own daily intention card" on daily_intention_cards;
create policy "Users manage their own daily intention card"
  on daily_intention_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índices básicos
create index if not exists events_event_idx on events(event);
create index if not exists events_created_at_idx on events(created_at);
create index if not exists rituals_created_at_idx on rituals(created_at);
create index if not exists rituals_user_id_idx on rituals(user_id);
create index if not exists ritual_favorites_user_id_idx on ritual_favorites(user_id);
create index if not exists ritual_favorites_ritual_id_idx on ritual_favorites(ritual_id);
create index if not exists ritual_likes_user_id_idx on ritual_likes(user_id);
create index if not exists ritual_likes_ritual_id_idx on ritual_likes(ritual_id);
create index if not exists daily_intention_cards_user_id_idx on daily_intention_cards(user_id);
create index if not exists daily_intention_cards_date_key_idx on daily_intention_cards(date_key);
