-- Adicionar campos para suporte ao storage híbrido
ALTER TABLE prestacoes_contas 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase' CHECK (storage_provider IN ('supabase', 'googledrive')),
ADD COLUMN IF NOT EXISTS storage_file_id TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Comentários para documentação
COMMENT ON COLUMN prestacoes_contas.storage_provider IS 'Provider de storage usado: supabase para arquivos ≤50MB, googledrive para arquivos >50MB';
COMMENT ON COLUMN prestacoes_contas.storage_file_id IS 'ID do arquivo no Google Drive (quando storage_provider = googledrive)';
COMMENT ON COLUMN prestacoes_contas.storage_path IS 'Caminho do arquivo no Supabase Storage (quando storage_provider = supabase)';

-- Índice para consultas por provider
CREATE INDEX IF NOT EXISTS idx_prestacoes_contas_storage_provider ON prestacoes_contas(storage_provider);

-- Atualizar registros existentes para usar supabase como provider padrão
UPDATE prestacoes_contas 
SET storage_provider = 'supabase', storage_path = arquivo_url 
WHERE storage_provider IS NULL AND arquivo_url IS NOT NULL;
