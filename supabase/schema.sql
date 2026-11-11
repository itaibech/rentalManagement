-- Rental management app schema on the shared itaibechor-site Supabase project.
-- Apply once with itaibechor/scripts/add-app.sh rental <redirect-url> -- supabase/schema.sql
set search_path to rental, public;

create table members (
  id serial primary key,
  name text not null unique,
  share numeric not null check (share > 0 and share <= 1),
  email text unique
);

-- Admin signs in with Google; members are any Google account whose email is in rental.members.
-- app_metadata is not user-writable, user_metadata is.
create or replace function rental.is_admin() returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'itai.bechor@gmail.com'
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
$$;
create or replace function rental.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select rental.is_admin() or (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
    and exists (select 1 from rental.members m where lower(m.email) = lower(auth.jwt() ->> 'email')))
$$;

create table apartments (
  id serial primary key,
  name text not null unique,
  address text,
  area_sqm numeric,
  rent numeric(10,2) not null default 0,
  contract_end date,
  deposit_member_id int references members(id),
  electricity_contract text,
  electricity_meter text,
  arnona_account text,
  arnona_contract text,
  water_company text,
  water_account text,
  property_tax_no text,
  notes text
);

create table tenants (
  id serial primary key,
  apartment_id int not null references apartments(id) on delete cascade,
  name text not null,
  phone text,
  id_number text,
  email text,
  active boolean not null default true
);

-- Settled rows are history: the balance only counts unsettled expenses, rent and transfers.
create table expenses (
  id serial primary key,
  date date not null,
  description text not null,
  category text not null default 'שוטף' check (category in ('שוטף','ביטוח','שיפוץ','מיסים','אחר')),
  apartment_id int references apartments(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  paid_by int not null references members(id),
  settled boolean not null default false
);

create table rent_payments (
  id serial primary key,
  month date not null,
  apartment_id int not null references apartments(id) on delete cascade,
  amount numeric(10,2) not null,
  deposited_to int not null references members(id),
  method text not null default 'צ׳ק',
  settled boolean not null default false,
  unique (month, apartment_id)
);

create table transfers (
  id serial primary key,
  date date not null default current_date,
  from_member int not null references members(id),
  to_member int not null references members(id),
  amount numeric(10,2) not null check (amount > 0),
  method text not null default 'העברה בנקאית',
  note text,
  settled boolean not null default false,
  check (from_member <> to_member)
);

create table tasks (
  id serial primary key,
  title text not null,
  apartment_id int references apartments(id) on delete cascade,
  due_date date,
  interval_months int check (interval_months > 0),
  done boolean not null default false,
  notes text
);

create table attachments (
  id serial primary key,
  name text not null,
  path text not null unique,
  apartment_id int references apartments(id) on delete cascade,
  task_id int references tasks(id) on delete cascade,
  expense_id int references expenses(id) on delete cascade,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['apartments','tenants','expenses','rent_payments','transfers','tasks','attachments'] loop
    execute format('alter table rental.%I enable row level security', t);
    execute format('create policy %I on rental.%I for all using (rental.is_member()) with check (rental.is_member())', t || '_members', t);
  end loop;
end $$;
alter table members enable row level security;
create policy members_read on members for select using (rental.is_member());
create policy members_admin on members for all using (rental.is_admin()) with check (rental.is_admin());

insert into storage.buckets (id, name, public) values ('rental', 'rental', false) on conflict do nothing;
create policy rental_files on storage.objects for all
  using (bucket_id = 'rental' and rental.is_member()) with check (bucket_id = 'rental' and rental.is_member());

insert into members (name, share, email) values
  ('איתי', 1/6.0, 'itai.bechor@gmail.com'), ('עופר', 1/6.0, null), ('איה', 1/6.0, null), ('לינה', 0.5, null);

-- Completing a recurring task schedules the next one.
create or replace function rental.next_task() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.done and not old.done and new.interval_months is not null and new.due_date is not null then
    insert into rental.tasks (title, apartment_id, due_date, interval_months, notes)
    values (new.title, new.apartment_id, new.due_date + make_interval(months => new.interval_months), new.interval_months, new.notes);
  end if;
  return new;
end $$;
create trigger next_task after update on tasks for each row execute function rental.next_task();
