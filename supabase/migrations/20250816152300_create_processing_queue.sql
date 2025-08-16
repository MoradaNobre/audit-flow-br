-- Migração: Sistema de Queue para Processamento Assíncrono
-- Data: 2025-08-16
-- Descrição: Cria tabelas para gerenciar processamento assíncrono de PDFs

-- Enum para status do processamento
CREATE TYPE processing_status AS ENUM (
  'pending',     -- Aguardando processamento
  'processing',  -- Em processamento
  'completed',   -- Concluído com sucesso
  'failed',      -- Falhou
  'cancelled'    -- Cancelado pelo usuário
);

-- Enum para prioridade das tarefas
CREATE TYPE task_priority AS ENUM (
  'low',         -- Baixa prioridade
  'normal',      -- Prioridade normal
  'high',        -- Alta prioridade
  'urgent'       -- Urgente
);

-- Tabela principal do queue de processamento
CREATE TABLE processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Referências
  prestacao_id UUID NOT NULL REFERENCES prestacoes_contas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status e controle
  status processing_status DEFAULT 'pending' NOT NULL,
  priority task_priority DEFAULT 'normal' NOT NULL,
  
  -- Dados do arquivo
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'googledrive',
  
  -- Progresso e resultados
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_stage TEXT DEFAULT 'queued',
  stage_message TEXT,
  
  -- Dados extraídos (JSON)
  extracted_data JSONB,
  
  -- Controle de tentativas
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Logs e erros
  error_message TEXT,
  error_details JSONB,
  processing_logs JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela para histórico de processamento
CREATE TABLE processing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES processing_queue(id) ON DELETE CASCADE,
  
  -- Status anterior e novo
  previous_status processing_status,
  new_status processing_status NOT NULL,
  
  -- Detalhes da mudança
  stage TEXT,
  message TEXT,
  details JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_processing_queue_status ON processing_queue(status);
CREATE INDEX idx_processing_queue_priority ON processing_queue(priority);
CREATE INDEX idx_processing_queue_user_id ON processing_queue(user_id);
CREATE INDEX idx_processing_queue_created_at ON processing_queue(created_at);
CREATE INDEX idx_processing_queue_status_priority ON processing_queue(status, priority, created_at);

CREATE INDEX idx_processing_history_queue_id ON processing_history(queue_id);
CREATE INDEX idx_processing_history_created_at ON processing_history(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_processing_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trigger_update_processing_queue_updated_at
  BEFORE UPDATE ON processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_processing_queue_updated_at();

-- Função para registrar mudanças de status no histórico
CREATE OR REPLACE FUNCTION log_processing_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se o status mudou
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO processing_history (
      queue_id,
      previous_status,
      new_status,
      stage,
      message,
      details
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.current_stage,
      NEW.stage_message,
      jsonb_build_object(
        'progress', NEW.progress_percentage,
        'retry_count', NEW.retry_count,
        'error_message', NEW.error_message
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para log de mudanças
CREATE TRIGGER trigger_log_processing_status_change
  AFTER UPDATE ON processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION log_processing_status_change();

-- RLS (Row Level Security)
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para processing_queue
CREATE POLICY "Usuários podem ver suas próprias tarefas"
  ON processing_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias tarefas"
  ON processing_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias tarefas"
  ON processing_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para processing_history
CREATE POLICY "Usuários podem ver histórico de suas tarefas"
  ON processing_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processing_queue 
      WHERE processing_queue.id = processing_history.queue_id 
      AND processing_queue.user_id = auth.uid()
    )
  );

-- Função para obter próxima tarefa da fila (para workers)
CREATE OR REPLACE FUNCTION get_next_queue_task()
RETURNS TABLE (
  task_id UUID,
  prestacao_id UUID,
  file_url TEXT,
  file_name TEXT,
  priority task_priority
) AS $$
BEGIN
  RETURN QUERY
  UPDATE processing_queue
  SET 
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT pq.id
    FROM processing_queue pq
    WHERE pq.status = 'pending'
    AND pq.retry_count < pq.max_retries
    ORDER BY 
      CASE pq.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      pq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    processing_queue.id as task_id,
    processing_queue.prestacao_id,
    processing_queue.file_url,
    processing_queue.file_name,
    processing_queue.priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE processing_queue IS 'Fila de processamento assíncrono para PDFs';
COMMENT ON TABLE processing_history IS 'Histórico de mudanças de status das tarefas';
COMMENT ON FUNCTION get_next_queue_task() IS 'Obtém próxima tarefa da fila para processamento';
