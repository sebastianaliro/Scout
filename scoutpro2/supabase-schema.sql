-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'scout' check (role in ('admin', 'scout')),
  created_at timestamptz not null default now()
);

-- Players table
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references auth.users(id) on delete set null,
  full_name text not null,
  position text not null check (position in ('goalkeeper', 'defender', 'midfielder', 'forward')),
  current_club text,
  nationality text not null default '',
  birth_date date,
  contract_end date,
  salary_eur numeric,
  market_value_eur numeric,
  status text not null default 'active' check (status in ('active', 'free', 'negotiating', 'injured')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Scout reports table
create table public.scout_reports (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references public.players(id) on delete cascade not null,
  scout_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('internal', 'external')),
  report_text text not null default '',
  goals integer not null default 0,
  assists integer not null default 0,
  matches integer not null default 0,
  rating numeric not null default 0 check (rating >= 0 and rating <= 10),
  video_url text,
  created_at timestamptz not null default now()
);

-- Matches table
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references auth.users(id) on delete set null,
  home_team text not null,
  away_team text not null,
  competition text not null default '',
  match_date timestamptz not null,
  result text,
  created_at timestamptz not null default now()
);

-- Diary notes table
create table public.diary_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  content text not null,
  tag text not null default 'general' check (tag in ('scouting', 'contract', 'player', 'general')),
  created_at timestamptz not null default now()
);

-- Notifications table
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'general',
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'scout'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.scout_reports enable row level security;
alter table public.matches enable row level security;
alter table public.diary_notes enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can see all, update only their own
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Players: all authenticated users can read/write
create policy "players_all" on public.players for all to authenticated using (true) with check (true);

-- Scout reports: all authenticated users can read/write
create policy "scout_reports_all" on public.scout_reports for all to authenticated using (true) with check (true);

-- Matches: all authenticated users can read/write
create policy "matches_all" on public.matches for all to authenticated using (true) with check (true);

-- Diary notes: users can only see/write their own
create policy "diary_notes_own" on public.diary_notes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications: users can only see their own
create policy "notifications_own" on public.notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
