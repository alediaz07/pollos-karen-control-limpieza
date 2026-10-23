-- Route new cleaning submissions through a server-side Edge Function.
revoke execute on function public.submit_cleaning(text,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.submit_cleaning(text,uuid,text[],text) to service_role;

create or replace function public.submit_cleaning(p_area text,p_employee_id uuid,p_tasks text[],p_signature text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text; v_expected text[];
begin
 perform pg_catalog.pg_advisory_xact_lock(70472821);
 if p_area not in ('Baños','Cocina','Mesas') then raise exception 'Área inválida'; end if;
 select name into v_name from public.employees where id=p_employee_id and active=true;
 if v_name is null then raise exception 'Colaborador inválido'; end if;
 if (select count(*) from public.cleaning_records where created_at>now()-interval '1 hour')>=250 then raise exception 'Límite temporal de registros alcanzado'; end if;
 if (select count(*) from public.cleaning_records where employee_id=p_employee_id and created_at>now()-interval '10 minutes')>=12 then raise exception 'Demasiados registros seguidos para este colaborador'; end if;
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
revoke all on function public.submit_cleaning(text,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.submit_cleaning(text,uuid,text[],text) to service_role;
