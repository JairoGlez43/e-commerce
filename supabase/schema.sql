-- Catalog tables, read access and the photo bucket (spec 0013).
-- Run once in the Supabase dashboard SQL editor, before seed.sql.
-- The column rules mirror the zod schema of spec 0004, so bad data is refused by the database too.

create table public.categories (
  id         text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (char_length(name) between 1 and 30),
  -- "order" is an SQL keyword; the build maps sort_order back to `order`.
  sort_order integer not null check (sort_order >= 0)
);

create table public.products (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 60),
  -- A category that still has products cannot be deleted.
  category_id text not null references public.categories (id) on delete restrict,
  price       integer not null check (price > 0),
  unit        text not null check (char_length(unit) between 1 and 30),
  in_stock    boolean not null default true,
  description text not null check (char_length(description) between 1 and 300),
  -- Object path inside the product-photos bucket, e.g. "arroz-blanco.jpg".
  photo_path  text not null check (char_length(photo_path) > 0)
);

-- Everyone may read the catalog. There are no write policies, so with RLS on every write
-- through the public key is refused (the owner's write policies come with features 11/12).
-- The grants are explicit because new Supabase projects may not expose tables by default.
alter table public.categories enable row level security;
grant select on table public.categories to anon, authenticated;
create policy "categories are public to read" on public.categories
  for select to anon, authenticated using (true);

alter table public.products enable row level security;
grant select on table public.products to anon, authenticated;
create policy "products are public to read" on public.products
  for select to anon, authenticated using (true);

-- Public bucket: anyone can read a photo by its URL. No upload policies yet (feature 14).
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true);
