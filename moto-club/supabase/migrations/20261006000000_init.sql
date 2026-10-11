-- Moto Club — schéma initial
-- Profils, garage, sorties, inscriptions, statistiques de pilote, stockage des photos.

-- ─────────────────────────────────────────────────────────────
-- Types
-- ─────────────────────────────────────────────────────────────
create type public.ride_kind as enum ('route', 'circuit');
create type public.ride_level as enum ('detente', 'intermediaire', 'confirme', 'expert');

-- ─────────────────────────────────────────────────────────────
-- Profils
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  pseudo      text not null check (char_length(pseudo) between 2 and 30),
  avatar_path text,
  race_number smallint check (race_number between 1 and 99),
  city        text check (char_length(city) <= 60),
  bio         text check (char_length(bio) <= 280),
  created_at  timestamptz not null default now()
);

-- Crée le profil à l'inscription (email, Apple ou Google).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pseudo text;
begin
  v_pseudo := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'pseudo'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'pilote'), '@', 1)
  );
  v_pseudo := left(v_pseudo, 30);
  if char_length(v_pseudo) < 2 then
    v_pseudo := 'Pilote';
  end if;

  insert into public.profiles (id, pseudo, race_number)
  values (new.id, v_pseudo, 1 + floor(random() * 99)::smallint);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Garage
-- ─────────────────────────────────────────────────────────────
create table public.bikes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  brand         text not null check (char_length(brand) between 1 and 40),
  model         text not null check (char_length(model) between 1 and 60),
  year          smallint check (year between 1900 and 2100),
  displacement_cc smallint check (displacement_cc between 50 and 3000),
  mileage_km    integer check (mileage_km between 0 and 2000000),
  description   text check (char_length(description) <= 2000),
  modifications text check (char_length(modifications) <= 2000),
  photo_path    text,
  created_at    timestamptz not null default now()
);
create index bikes_owner_idx on public.bikes (owner_id);

-- ─────────────────────────────────────────────────────────────
-- Sorties
-- ─────────────────────────────────────────────────────────────
create table public.rides (
  id              uuid primary key default gen_random_uuid(),
  organizer_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 3 and 80),
  kind            public.ride_kind not null default 'route',
  level           public.ride_level not null default 'intermediaire',
  starts_at       timestamptz not null,
  meeting_point   text not null check (char_length(meeting_point) between 2 and 140),
  -- Tracé : tableau de positions [lng, lat] posées à la main sur la carte.
  route           jsonb not null check (jsonb_typeof(route) = 'array' and jsonb_array_length(route) >= 2),
  distance_km     numeric(7, 1) not null check (distance_km >= 0),
  duration_min    integer check (duration_min between 0 and 2880),
  elevation_gain_m integer check (elevation_gain_m >= 0),
  max_riders      smallint not null check (max_riders between 2 and 100),
  description     text check (char_length(description) <= 2000),
  created_at      timestamptz not null default now()
);
create index rides_starts_at_idx on public.rides (starts_at);
create index rides_organizer_idx on public.rides (organizer_id);

-- ─────────────────────────────────────────────────────────────
-- Inscriptions (la « grille »)
-- ─────────────────────────────────────────────────────────────
create table public.ride_participants (
  ride_id   uuid not null references public.rides (id) on delete cascade,
  user_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- La moto peut être retirée du garage plus tard : on garde l'inscription.
  bike_id   uuid references public.bikes (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
create index ride_participants_user_idx on public.ride_participants (user_id);

-- Contrôles à l'inscription. Le verrou sur la sortie sérialise les inscriptions
-- concurrentes : impossible de dépasser le nombre de places.
create function public.check_ride_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ride  public.rides%rowtype;
  v_count integer;
begin
  select * into v_ride from public.rides where id = new.ride_id for update;
  if not found then
    raise exception 'Sortie introuvable.' using errcode = 'P0002';
  end if;

  if v_ride.starts_at <= now() then
    raise exception 'Cette sortie a déjà commencé.' using errcode = 'P0001';
  end if;

  if new.bike_id is null or not exists (
    select 1 from public.bikes b where b.id = new.bike_id and b.owner_id = new.user_id
  ) then
    raise exception 'Choisis une moto de ton garage.' using errcode = 'P0001';
  end if;

  select count(*) into v_count from public.ride_participants where ride_id = new.ride_id;
  if v_count >= v_ride.max_riders then
    raise exception 'Complet : plus aucune place sur la grille.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger ride_participants_before_insert
  before insert on public.ride_participants
  for each row execute function public.check_ride_join();

-- Changement de moto : seulement pour une moto du garage et avant le départ.
create function public.check_ride_bike_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ride_id <> old.ride_id or new.user_id <> old.user_id then
    raise exception 'Modification interdite.' using errcode = 'P0001';
  end if;
  -- Moto supprimée du garage (on delete set null) : on conserve l'inscription.
  if new.bike_id is null then
    return new;
  end if;
  if exists (select 1 from public.rides r where r.id = new.ride_id and r.starts_at <= now()) then
    raise exception 'Cette sortie a déjà commencé.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.bikes b where b.id = new.bike_id and b.owner_id = new.user_id
  ) then
    raise exception 'Choisis une moto de ton garage.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger ride_participants_before_update
  before update of bike_id, ride_id, user_id on public.ride_participants
  for each row execute function public.check_ride_bike_change();

-- Désinscription : pas après le départ (l'historique alimente l'XP),
-- et l'organisateur reste sur sa grille (il supprime la sortie à la place).
-- Lors d'une suppression en cascade (sortie ou compte), on laisse passer.
create function public.check_ride_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ride public.rides%rowtype;
begin
  select * into v_ride from public.rides where id = old.ride_id;
  if not found
     or not exists (select 1 from public.profiles where id = old.user_id) then
    return old;
  end if;
  if v_ride.organizer_id = old.user_id then
    raise exception 'L''organisateur ne peut pas quitter sa sortie : supprime-la.' using errcode = 'P0001';
  end if;
  if v_ride.starts_at <= now() then
    raise exception 'Cette sortie a déjà commencé.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger ride_participants_before_delete
  before delete on public.ride_participants
  for each row execute function public.check_ride_leave();

-- On ne réduit pas le nombre de places sous le nombre d'inscrits.
create function public.check_ride_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if new.organizer_id <> old.organizer_id then
    raise exception 'Organisateur non modifiable.' using errcode = 'P0001';
  end if;
  select count(*) into v_count from public.ride_participants where ride_id = new.id;
  if new.max_riders < v_count then
    raise exception 'Il y a déjà % inscrits sur cette sortie.', v_count using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger rides_before_update
  before update on public.rides
  for each row execute function public.check_ride_update();

-- Création d'une sortie + inscription de l'organisateur avec sa moto, en une transaction.
create function public.create_ride(
  p_title text,
  p_kind public.ride_kind,
  p_level public.ride_level,
  p_starts_at timestamptz,
  p_meeting_point text,
  p_route jsonb,
  p_distance_km numeric,
  p_duration_min integer,
  p_elevation_gain_m integer,
  p_max_riders smallint,
  p_description text,
  p_bike_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_starts_at <= now() then
    raise exception 'La date de départ doit être dans le futur.' using errcode = 'P0001';
  end if;

  insert into public.rides (
    title, kind, level, starts_at, meeting_point, route,
    distance_km, duration_min, elevation_gain_m, max_riders, description
  ) values (
    p_title, p_kind, p_level, p_starts_at, p_meeting_point, p_route,
    p_distance_km, p_duration_min, p_elevation_gain_m, p_max_riders, p_description
  )
  returning id into v_id;

  insert into public.ride_participants (ride_id, bike_id) values (v_id, p_bike_id);
  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Statistiques de pilote (XP calculée côté base, source unique)
-- Seules les sorties passées comptent : on ne gagne pas d'XP en s'inscrivant.
-- ─────────────────────────────────────────────────────────────
create view public.pilot_stats
with (security_invoker = true)
as
with done as (
  select rp.user_id, r.*
  from public.ride_participants rp
  join public.rides r on r.id = rp.ride_id
  where r.starts_at < now()
)
select
  p.id as user_id,
  coalesce(d.rides_done, 0)::int        as rides_done,
  coalesce(d.circuit_days, 0)::int      as circuit_days,
  coalesce(d.expert_rides, 0)::int      as expert_rides,
  coalesce(d.km_total, 0)::numeric(9,1) as km_total,
  coalesce(d.elevation_total, 0)::int   as elevation_total,
  coalesce(o.rides_organized, 0)::int   as rides_organized,
  coalesce(o.riders_hosted, 0)::int     as riders_hosted,
  coalesce(b.bikes_count, 0)::int       as bikes_count,
  (
    coalesce(d.rides_done, 0) * 100
    + floor(coalesce(d.km_total, 0))
    + coalesce(d.circuit_days, 0) * 50
    + coalesce(d.expert_rides, 0) * 50
    + coalesce(o.rides_organized, 0) * 150
    + coalesce(o.riders_hosted, 0) * 10
    + least(coalesce(b.bikes_count, 0), 5) * 20
  )::int as xp
from public.profiles p
left join (
  select
    user_id,
    count(*)                                  as rides_done,
    count(*) filter (where kind = 'circuit')  as circuit_days,
    count(*) filter (where level = 'expert')  as expert_rides,
    sum(distance_km)                          as km_total,
    sum(coalesce(elevation_gain_m, 0))        as elevation_total
  from done
  group by user_id
) d on d.user_id = p.id
left join (
  select
    r.organizer_id,
    count(distinct r.id) as rides_organized,
    count(rp.user_id) filter (where rp.user_id <> r.organizer_id) as riders_hosted
  from public.rides r
  left join public.ride_participants rp on rp.ride_id = r.id
  where r.starts_at < now()
  group by r.organizer_id
) o on o.organizer_id = p.id
left join (
  select owner_id, count(*) as bikes_count from public.bikes group by owner_id
) b on b.owner_id = p.id;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.bikes enable row level security;
alter table public.rides enable row level security;
alter table public.ride_participants enable row level security;

-- Profils : lisibles par tous les membres, modifiables par leur propriétaire.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Garages : visibles (la grille affiche les motos), modifiables par le propriétaire.
create policy "bikes_select" on public.bikes
  for select to authenticated using (true);
create policy "bikes_insert_own" on public.bikes
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "bikes_update_own" on public.bikes
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "bikes_delete_own" on public.bikes
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Sorties : visibles par tous, gérées par l'organisateur.
create policy "rides_select" on public.rides
  for select to authenticated using (true);
create policy "rides_insert_own" on public.rides
  for insert to authenticated with check (organizer_id = (select auth.uid()));
create policy "rides_update_own" on public.rides
  for update to authenticated
  using (organizer_id = (select auth.uid())) with check (organizer_id = (select auth.uid()));
create policy "rides_delete_own" on public.rides
  for delete to authenticated using (organizer_id = (select auth.uid()));

-- Inscriptions : chacun gère la sienne.
create policy "participants_select" on public.ride_participants
  for select to authenticated using (true);
create policy "participants_insert_own" on public.ride_participants
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "participants_update_own" on public.ride_participants
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "participants_delete_own" on public.ride_participants
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.check_ride_join() from public, anon, authenticated;
revoke all on function public.check_ride_bike_change() from public, anon, authenticated;
revoke all on function public.check_ride_leave() from public, anon, authenticated;
revoke all on function public.check_ride_update() from public, anon, authenticated;
revoke all on function public.create_ride(text, public.ride_kind, public.ride_level, timestamptz, text, jsonb, numeric, integer, integer, smallint, text, uuid) from public, anon;
grant execute on function public.create_ride(text, public.ride_kind, public.ride_level, timestamptz, text, jsonb, numeric, integer, integer, smallint, text, uuid) to authenticated;
grant select on public.pilot_stats to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Stockage : photos de motos et avatars.
-- Lecture publique ; écriture uniquement dans le dossier <uid>/.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('bike-photos', 'bike-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('avatars', 'avatars', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "photos_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('bike-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "photos_update_own_folder" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('bike-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "photos_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('bike-photos', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
