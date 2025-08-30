-- Core relational schema for YouTube analytics
-- Use with Vercel Postgres. Apply via psql or your migration tool.

create table if not exists users (
  id text primary key,
  email text,
  created_at timestamptz default now()
);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  blob_path text not null,
  received_at timestamptz default now(),
  processed_at timestamptz,
  source_hash text,
  rows_parsed int default 0,
  status text default 'pending',
  error text
);

create table if not exists channels (
  channel_id text primary key,
  name text,
  thumbnail_url text
);

create table if not exists videos (
  video_id text primary key,
  channel_id text references channels(channel_id) on delete set null,
  title text,
  duration_sec int,
  category text,
  published_at timestamptz,
  lang text,
  metadata jsonb
);

create table if not exists watch_events (
  id bigserial primary key,
  user_id text not null references users(id) on delete cascade,
  video_id text not null references videos(video_id) on delete cascade,
  channel_id text references channels(channel_id) on delete set null,
  started_at timestamptz,
  watched_seconds int,
  device text,
  source_upload_id uuid references uploads(id) on delete set null,
  unique_hash text,
  raw jsonb
);
create unique index if not exists idx_watch_events_uniq on watch_events(user_id, unique_hash);
create index if not exists idx_watch_events_user_time on watch_events(user_id, started_at desc);

create table if not exists daily_user_metrics (
  user_id text not null references users(id) on delete cascade,
  date date not null,
  minutes_watched int default 0,
  videos int default 0,
  unique_channels int default 0,
  primary key(user_id, date)
);

create table if not exists user_video_stats (
  user_id text not null references users(id) on delete cascade,
  video_id text not null references videos(video_id) on delete cascade,
  views int default 0,
  total_watch_seconds int default 0,
  first_watched_at timestamptz,
  last_watched_at timestamptz,
  primary key(user_id, video_id)
);

create table if not exists user_channel_stats (
  user_id text not null references users(id) on delete cascade,
  channel_id text not null references channels(channel_id) on delete cascade,
  views int default 0,
  total_watch_seconds int default 0,
  primary key(user_id, channel_id)
);

-- People/entities appearing in videos (podcast guests etc.)
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alias text[],
  created_at timestamptz default now()
);

create table if not exists video_people (
  video_id text not null references videos(video_id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  confidence real,
  method text,
  primary key(video_id, person_id)
);

-- LLM runs & outputs for insights
create table if not exists llm_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  run_type text not null,
  input_fingerprint text,
  model text,
  args jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text,
  cost_cents int
);

create table if not exists llm_outputs (
  run_id uuid not null references llm_runs(id) on delete cascade,
  output_type text,
  content_text text,
  content_json jsonb
);

