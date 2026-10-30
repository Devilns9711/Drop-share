-- Run this in Supabase Dashboard -> SQL Editor.
-- Public links are intentionally accessible to anyone who has the URL.
create table if not exists public.shared_files (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null,
  file_name text not null,
  file_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  created_at timestamptz not null default now()
);
create index if not exists shared_files_share_id_idx on public.shared_files (share_id, created_at);
alter table public.shared_files enable row level security;
-- Anyone can create a public share. Add CAPTCHA/rate limiting before promoting widely.
create policy "Anyone can create shared file rows" on public.shared_files for insert to anon, authenticated with check (
  share_id is not null and length(file_name) between 1 and 255 and length(file_path) between 1 and 500
  and length(public_url) between 1 and 2000 and length(mime_type) between 1 and 150
  and size_bytes > 0 and size_bytes <= 104857600
);
create policy "Anyone can view shared file rows" on public.shared_files for select to anon, authenticated using (true);

-- Create a public bucket for original file delivery, capped at 100 MB per object.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shared-media', 'shared-media', true, 104857600, array[
  'image/jpeg','image/png','image/gif','image/webp','image/avif','image/heic','image/heif','image/bmp','image/tiff',
  'video/mp4','video/webm','video/quicktime','video/x-msvideo','video/x-matroska','video/3gpp','video/3gpp2','video/mpeg','video/ogg'
]) on conflict (id) do update set public = true, file_size_limit = 104857600;
create policy "Anyone can upload shared media" on storage.objects for insert to anon, authenticated with check (
  bucket_id = 'shared-media' and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
);
