-- Owner login: who counts as the shop owner (spec 0014).
-- Run once in the Supabase dashboard SQL editor, after schema.sql.
--
-- Dashboard settings to set by hand first, once per shop (spec 0014, "Supabase settings"):
--   Authentication > Sign In / Providers: "Allow new users to sign up" OFF.
--   Authentication > Email: minimum password length 8; email OTP expiration 3600 s (default,
--     how long a recovery link lasts). Email templates stay untouched (editing needs custom SMTP).
--   Authentication > URL Configuration: Site URL = the site's /admin/ URL
--     (demo: https://tienda-demo-cuba.vercel.app/admin/); Redirect URLs = that same URL plus
--     http://localhost:4321/admin/ (exact, with the trailing slash).
--   Authentication > Users > Add user > Create new user: the owner's email (a member of the
--     project's organization, or the default sender will not deliver to it), a first password,
--     auto-confirm on.

-- True only for the shop owner's JWT. Used by the write policies (feature 12) and the publish
-- Edge Function (feature 13). Without a signed-in user, auth.jwt() is null and this is false.
create or replace function public.is_owner() returns boolean
  language sql stable
  as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false) $$;

-- Run once per shop after creating the owner user (replace the email). app_metadata cannot be
-- changed by the user; the new role reaches the JWT at the next sign-in or token refresh.
-- update auth.users
--   set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'
--   where email = 'owner@example.com';
