-- =============================================================================
-- SafeTrade – Supabase Storage: bucket e policy RLS
-- =============================================================================
-- PASSO 1 (Dashboard, se il bucket non esiste):
--   Supabase Dashboard → Storage → New bucket
--   - Name: safetrade-images
--   - Public bucket: ON (per URL pubbliche delle immagini)
--   - File size limit: 5 MB (opzionale)
--   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif (opzionale)
--
-- PASSO 2: Esegui questo script nel SQL Editor del progetto Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket (solo se il tuo Supabase consente INSERT su storage.buckets;
-- altrimenti crea il bucket dal Dashboard come in PASSO 1)
-- Se l'INSERT fallisce (tabella read-only), ignora e crea il bucket da Dashboard.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'safetrade-images',
  'safetrade-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Variante minimale se la tabella ha solo (id, name, public):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('safetrade-images', 'safetrade-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Policy RLS su storage.objects per il bucket safetrade-images
-- (Esegui anche se il bucket l’hai creato solo da Dashboard)
-- -----------------------------------------------------------------------------

-- Lettura pubblica: chiunque può vedere i file (necessario per getPublicUrl)
DROP POLICY IF EXISTS "safetrade_images_public_read" ON storage.objects;
CREATE POLICY "safetrade_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'safetrade-images');

-- Upload: solo utenti autenticati possono caricare in safetrade-images
DROP POLICY IF EXISTS "safetrade_images_authenticated_insert" ON storage.objects;
CREATE POLICY "safetrade_images_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'safetrade-images');

-- Update: utenti autenticati possono aggiornare (es. upsert) i propri file
DROP POLICY IF EXISTS "safetrade_images_authenticated_update" ON storage.objects;
CREATE POLICY "safetrade_images_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'safetrade-images')
WITH CHECK (bucket_id = 'safetrade-images');

-- Delete: utenti autenticati possono eliminare file nel bucket (es. deleteImage)
DROP POLICY IF EXISTS "safetrade_images_authenticated_delete" ON storage.objects;
CREATE POLICY "safetrade_images_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'safetrade-images');

-- =============================================================================
-- Riepilogo bucket usati dall’app
-- =============================================================================
-- | Nome bucket       | Uso                    | Cartelle esempio   |
-- |-------------------|------------------------|--------------------|
-- | safetrade-images  | Listing, shop, vault   | listings/, ...     |
-- =============================================================================
