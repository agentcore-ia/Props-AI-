create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'agent' check (role in ('superadmin', 'agency_admin', 'agent')),
  agency_slug text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  slug text not null unique,
  email text not null unique,
  phone text not null,
  owner_name text not null,
  owner_email text not null unique,
  plan text not null default 'Starter' check (plan in ('Starter', 'Growth', 'Scale')),
  status text not null default 'Activa' check (status in ('Activa', 'En onboarding')),
  city text not null,
  tagline text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  title text not null,
  price numeric(14, 2) not null default 0,
  location text not null,
  status text not null check (status in ('Disponible', 'Reservada', 'Vendida', 'Alquilada')),
  operation text not null check (operation in ('Venta', 'Alquiler')),
  description text not null,
  image text not null,
  images jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;
alter table public.agencies enable row level security;
alter table public.properties enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
drop trigger if exists agencies_set_updated_at on public.agencies;
drop trigger if exists properties_set_updated_at on public.properties;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create trigger agencies_set_updated_at
  before update on public.agencies
  for each row execute procedure public.touch_updated_at();

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute procedure public.touch_updated_at();

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Public can view agencies" on public.agencies;
drop policy if exists "Public can view properties" on public.properties;

create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Public can view agencies"
on public.agencies
for select
using (true);

create policy "Public can view properties"
on public.properties
for select
using (true);
