-- The owner's writes on products (spec 0015). Reads stay public (schema.sql).
-- Run once in the Supabase dashboard SQL editor, after auth.sql. Order for every new shop:
-- schema.sql → seed.sql → auth.sql → products-write.sql.

-- A product may have no photo until feature 14 uploads one. The existing check still refuses
-- an empty string, and a check passes on null.
alter table public.products alter column photo_path drop not null;

-- Only the owner may write. The grant opens the door to signed-in users; each policy then lets
-- through only a JWT whose app_metadata.role is "owner" (public.is_owner(), auth.sql).
grant insert, update, delete on table public.products to authenticated;
create policy "owner inserts products" on public.products
  for insert to authenticated with check (public.is_owner());
create policy "owner updates products" on public.products
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner deletes products" on public.products
  for delete to authenticated using (public.is_owner());

-- AC1 check (run, read the result, nothing is kept):
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"app_metadata":{}}';
--   insert into public.products (id, name, category_id, price, unit, description)
--     values ('prueba', 'Prueba', '<a category id>', 1, 'u', 'd');  -- expect 42501
-- rollback;
-- Repeat with '{"app_metadata":{"role":"owner"}}': the insert works, then rollback.
