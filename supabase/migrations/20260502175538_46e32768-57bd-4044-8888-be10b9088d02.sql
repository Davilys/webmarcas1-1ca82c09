
-- Bucket privado para upload do dump Perfex (ZIP/SQL) + NDJSON gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('perfex-import', 'perfex-import', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas Master Admin (davillys@gmail.com) pode ler/escrever
CREATE POLICY "Master can read perfex-import"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'perfex-import'
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com')
);

CREATE POLICY "Master can upload perfex-import"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'perfex-import'
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com')
);

CREATE POLICY "Master can update perfex-import"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'perfex-import'
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com')
);

CREATE POLICY "Master can delete perfex-import"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'perfex-import'
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'davillys@gmail.com')
);
