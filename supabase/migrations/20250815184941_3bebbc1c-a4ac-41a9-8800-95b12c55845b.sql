-- Increase file size limits for PDF uploads
-- Update the storage bucket to allow larger files (up to 100MB)
UPDATE storage.buckets 
SET 
  file_size_limit = 104857600,  -- 100MB in bytes
  allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'prestacoes-pdf';

-- Add a comment explaining the limits
COMMENT ON TABLE storage.buckets IS 
'Storage buckets with file size limit of 100MB for PDF uploads';