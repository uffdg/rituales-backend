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
  audio_url      text
);

alter table rituals add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table rituals add column if not exists title text;
alter table rituals add column if not exists intention_category text;
alter table rituals add column if not exists ai_ritual jsonb;
alter table rituals add column if not exists guided_session jsonb;
alter table rituals add column if not exists audio_url text;

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

-- Índices básicos
create index if not exists events_event_idx on events(event);
create index if not exists events_created_at_idx on events(created_at);
create index if not exists rituals_created_at_idx on rituals(created_at);
create index if not exists rituals_user_id_idx on rituals(user_id);
create index if not exists ritual_favorites_user_id_idx on ritual_favorites(user_id);
create index if not exists ritual_favorites_ritual_id_idx on ritual_favorites(ritual_id);
create index if not exists ritual_likes_user_id_idx on ritual_likes(user_id);
create index if not exists ritual_likes_ritual_id_idx on ritual_likes(ritual_id);
