-- The owner's writes on categories (spec 0018). Reads stay public (schema.sql).
-- Run once in the Supabase dashboard SQL editor, after photos.sql. Order for every new shop:
-- schema.sql → seed.sql → auth.sql → products-write.sql → publish.sql → photos.sql →
-- categories-write.sql.

-- No two categories share a place in the order (spec 0018, AC-14). Deferrable but not deferred:
-- checked when the statement ends, so the admin's one statement swap passes. Before running it,
-- this must return no rows (a tie makes the alter fail):
--   select sort_order, count(*) from public.categories group by sort_order having count(*) > 1;
alter table public.categories
  add constraint categories_sort_order_key unique (sort_order) deferrable initially immediate;

-- Only the owner may write. The grant opens the door to signed-in users; each policy then lets
-- through only a JWT whose app_metadata.role is "owner" (public.is_owner(), auth.sql).
-- The reorder upsert needs insert and update, plus the public select policy of schema.sql.
grant insert, update, delete on table public.categories to authenticated;
create policy "owner inserts categories" on public.categories
  for insert to authenticated with check (public.is_owner());
create policy "owner updates categories" on public.categories
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes categories" on public.categories
  for delete to authenticated using (public.is_owner());

-- AC-1 check (run, read the result, nothing is kept):
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"app_metadata":{}}';
--   insert into public.categories (id, name, sort_order) values ('prueba', 'Prueba', 99);  -- expect 42501
-- rollback;
-- Repeat with '{"app_metadata":{"role":"owner"}}': the insert works, then rollback.

-- AC-14 check (nothing is kept):
-- begin;
--   insert into public.categories (id, name, sort_order)
--     select 'prueba', 'Prueba', min(sort_order) from public.categories;  -- expect 23505
-- rollback;
