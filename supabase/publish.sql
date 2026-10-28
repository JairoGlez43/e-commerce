-- Publishing (spec 0016): when the catalog last changed, and each publish request.
-- Run once in the Supabase dashboard SQL editor, after products-write.sql. Order for every new
-- shop: schema.sql → seed.sql → auth.sql → products-write.sql → publish.sql.

-- One row: the time of the last change to the catalog. Only the trigger writes it.
create table public.catalog_state (
  id         boolean primary key default true check (id),
  changed_at timestamptz not null default now()
);
insert into public.catalog_state default values;
alter table public.catalog_state enable row level security;
grant select on table public.catalog_state to anon, authenticated;
create policy "catalog state is public to read" on public.catalog_state
  for select to anon, authenticated using (true);

-- security definer: the owner's role has no write grant on catalog_state.
-- The where is required: Supabase's pg_safeupdate refuses an update without one when it comes
-- through the REST API, triggers included (error 21000).
create or replace function public.touch_catalog() returns trigger
  language plpgsql security definer set search_path = ''
  as $$ begin update public.catalog_state set changed_at = now() where id = true; return null; end $$;
create trigger products_touch_catalog after insert or update or delete on public.products
  for each statement execute function public.touch_catalog();
create trigger categories_touch_catalog after insert or update or delete on public.categories
  for each statement execute function public.touch_catalog();

-- One row per publish request. The function inserts it with the caller's JWT, so this policy
-- is the owner check.
create table public.publishes (
  id           bigint generated always as identity primary key,
  requested_at timestamptz not null default now(),
  requested_by uuid not null default auth.uid()
);
alter table public.publishes enable row level security;
grant select, insert, delete on table public.publishes to authenticated;
create policy "owner reads publishes" on public.publishes
  for select to authenticated using (public.is_owner());
create policy "owner adds publishes" on public.publishes
  for insert to authenticated with check (public.is_owner());
create policy "owner removes publishes" on public.publishes
  for delete to authenticated using (public.is_owner());

-- AC1 check (run, read the result, nothing is kept):
-- select count(*) from public.catalog_state;  -- expect 1
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","app_metadata":{}}';
--   insert into public.publishes default values;  -- expect 42501
-- rollback;
-- Repeat with '{"sub":"00000000-0000-0000-0000-000000000000","app_metadata":{"role":"owner"}}':
-- the insert works, then rollback.
