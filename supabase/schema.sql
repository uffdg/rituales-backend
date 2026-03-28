-- Rituales
create table if not exists rituals (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),

  -- Inputs del usuario
  ritual_type   text,
  intention     text,
  energy        text,
  element       text,
  duration      integer,
  intensity     text,
  anchor        text,

  -- Ritual generado por IA
  ritual_title          text,
  ritual_opening        text,
  ritual_symbolic_action text,
  ritual_closing        text,

  -- Sesión guiada (JSON completo)
  guided_session jsonb,

  -- Audio (generado bajo demanda, cacheado)
  audio_url     text
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
