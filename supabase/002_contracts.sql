-- Contracts per apartment per year, signed copies and payment attachments.
-- Apply once: npx supabase db query --remote=hyeslwlewvvjiyizoduf -f supabase/002_contracts.sql
set search_path to rental, public;

alter table members add column if not exists full_name text;
update members set full_name = case name when 'איתי' then 'איתי בכור' when 'עופר' then 'עופר בכור' when 'איה' then 'איה בכור' when 'לינה' then 'לינה בוכור' end
  where full_name is null;

create table contracts (
  id serial primary key,
  apartment_id int not null references apartments(id) on delete cascade,
  tenant_id int references tenants(id) on delete set null,
  kind text not null default 'הארכה' check (kind in ('חוזה חדש', 'הארכה')),
  sign_date date,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  first_start date, -- date of the original lease, quoted in renewals
  rent numeric(10,2) not null check (rent > 0),
  status text not null default 'טיוטה' check (status in ('טיוטה', 'נחתם')),
  notes text
);
alter table contracts enable row level security;
create policy contracts_members on contracts for all using (rental.is_member()) with check (rental.is_member());

alter table attachments add column if not exists contract_id int references contracts(id) on delete cascade;
alter table attachments add column if not exists rent_payment_id int references rent_payments(id) on delete cascade;

-- A signed contract becomes the apartment's current terms (rent, end date) unless a later one exists.
create or replace function rental.apply_contract() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'נחתם' then
    update rental.apartments set rent = new.rent, contract_end = new.end_date
    where id = new.apartment_id and (contract_end is null or contract_end <= new.end_date);
  end if;
  return new;
end $$;
create trigger apply_contract after insert or update on contracts for each row execute function rental.apply_contract();
