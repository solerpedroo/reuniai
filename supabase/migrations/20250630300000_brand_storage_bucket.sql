-- Bucket público para assets de marca do bot (câmera virtual / screen share).
-- A Vexa Cloud baixa a imagem por URL — CDN estática do Supabase é mais confiável
-- que rotas dinâmicas do Next.js na Vercel.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand',
  'brand',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública (URL /storage/v1/object/public/brand/*).
create policy "brand_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'brand');
