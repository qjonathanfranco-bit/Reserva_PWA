-- Supabase -> SQL Editor -> pegar y Run
-- Da permiso a la clave publishable (rol anon) para usar los IDs automáticos.
grant usage, select on all sequences in schema public to anon;
alter default privileges in schema public grant usage, select on sequences to anon;
