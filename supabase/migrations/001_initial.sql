-- Initial migration for a separate Supabase project. Do not reuse Pollos Karen OS database.
create extension if not exists pgcrypto;
create table public.employees (id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true);
create table public.cleaning_records (id uuid primary key default gen_random_uuid(), area text not null check(area in ('Baños','Cocina','Mesas')), employee_id uuid not null references public.employees(id), employee_name text not null, created_at timestamptz not null default now());
create table public.cleaning_record_items (record_id uuid not null references public.cleaning_records(id), task text not null, primary key(record_id,task));
-- Initial implementation stores signature PNG as a data URL in a restricted table.
-- Migrate to a private Storage bucket with server-side processing before production.
create table public.cleaning_signatures (record_id uuid primary key references public.cleaning_records(id), signature_data text not null);
create table public.admin_users (user_id uuid primary key references auth.users(id));
alter table public.employees enable row level security;
alter table public.cleaning_records enable row level security;
alter table public.cleaning_record_items enable row level security;
alter table public.cleaning_signatures enable row level security;
alter table public.admin_users enable row level security;
create policy "public active employee list" on public.employees for select to anon,authenticated using(active=true);
create policy "admin employees" on public.employees for all to authenticated using(exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check(exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "admin read records" on public.cleaning_records for select to authenticated using(exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "admin read tasks" on public.cleaning_record_items for select to authenticated using(exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "admin read signatures" on public.cleaning_signatures for select to authenticated using(exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "admin list" on public.admin_users for select to authenticated using(user_id=auth.uid());
revoke all on public.cleaning_records, public.cleaning_record_items, public.cleaning_signatures, public.admin_users from anon,authenticated;
grant select on public.cleaning_records,public.cleaning_record_items,public.cleaning_signatures,public.admin_users to authenticated;
grant select on public.employees to anon,authenticated;
-- Server-side function inserts a signed record atomically.
create or replace function public.submit_cleaning(p_area text,p_employee_id uuid,p_tasks text[],p_signature text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text; v_expected text[];
begin
 if p_area not in ('Baños','Cocina','Mesas') then raise exception 'Área inválida'; end if;
 select name into v_name from public.employees where id=p_employee_id and active=true;
 if v_name is null then raise exception 'Colaborador inválido'; end if;
 v_expected := case p_area
 when 'Baños' then array['Desinfectar inodoros','Limpiar lavamanos y espejos','Limpiar pisos','Reponer jabón y papel','Vaciar basureros']
 when 'Cocina' then array['Desinfectar superficies','Limpiar equipos y utensilios','Limpiar pisos','Retirar residuos']
 else array['Limpiar y desinfectar todas las mesas','Limpiar sillas','Revisar el comedor'] end;
 if p_tasks is null or cardinality(p_tasks)<>cardinality(v_expected) or p_tasks @> v_expected is not true then raise exception 'Checklist incompleto'; end if;
 if p_signature is null or length(p_signature)>250000 or length(p_signature)<200 or p_signature !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' then raise exception 'Firma inválida'; end if;
 insert into public.cleaning_records(area,employee_id,employee_name) values(p_area,p_employee_id,v_name) returning id into v_id;
 insert into public.cleaning_record_items(record_id,task) select v_id,unnest(v_expected);
 insert into public.cleaning_signatures(record_id,signature_data) values(v_id,p_signature);
 return v_id;
end $$;
revoke all on function public.submit_cleaning(text,uuid,text[],text) from public;
grant execute on function public.submit_cleaning(text,uuid,text[],text) to anon,authenticated;
-- IMPORTANT: Add access restrictions, abuse protection / rate limits on a secure Edge Function or gateway before public use.
