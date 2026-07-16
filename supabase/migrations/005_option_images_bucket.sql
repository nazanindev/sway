-- Public storage bucket for option images uploaded from the create/edit flows.
-- The /api/upload route also creates this lazily via the service role, but
-- keeping it here documents the schema and covers clean deploys.
insert into storage.buckets (id, name, public, file_size_limit)
values ('option-images', 'option-images', true, 8388608)
on conflict (id) do nothing;
