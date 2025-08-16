-- Criar bucket para armazenar PDFs das prestações de contas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prestacoes-pdf',
  'prestacoes-pdf',
  true,
  104857600, -- 100MB limit
  ARRAY['application/pdf']
);

-- Política para permitir upload de arquivos autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de PDFs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'prestacoes-pdf' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'prestacoes'
);

-- Política para permitir leitura de arquivos públicos
CREATE POLICY "PDFs são públicos para leitura" ON storage.objects
FOR SELECT USING (
  bucket_id = 'prestacoes-pdf'
);

-- Política para permitir atualização pelos proprietários
CREATE POLICY "Usuários podem atualizar seus próprios arquivos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'prestacoes-pdf' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Política para permitir exclusão pelos proprietários
CREATE POLICY "Usuários podem deletar seus próprios arquivos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'prestacoes-pdf' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);
