-- =====================================================
-- SQL PARA COPIAR E COLAR NO SUPABASE
-- Sistema de Validação Financeira - Fase 2.1
-- =====================================================

-- 1. CRIAR TABELA FINANCIAL_ANALYSIS
CREATE TABLE IF NOT EXISTS financial_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prestacao_id UUID NOT NULL REFERENCES prestacoes_contas(id) ON DELETE CASCADE,
    validation_result JSONB NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas
    CONSTRAINT unique_prestacao_analysis UNIQUE(prestacao_id)
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_financial_analysis_prestacao_id ON financial_analysis(prestacao_id);
CREATE INDEX IF NOT EXISTS idx_financial_analysis_analyzed_at ON financial_analysis(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_analysis_validation_score ON financial_analysis USING GIN ((validation_result->'score'));
CREATE INDEX IF NOT EXISTS idx_financial_analysis_health ON financial_analysis USING GIN ((validation_result->'summary'->'overallHealth'));

-- 3. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_financial_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_financial_analysis_updated_at
    BEFORE UPDATE ON financial_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_analysis_updated_at();

-- 4. ADICIONAR CAMPOS NA TABELA PRESTACOES_CONTAS
DO $$ 
BEGIN
    -- Adicionar analysis_status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_status'
    ) THEN
        ALTER TABLE prestacoes_contas ADD COLUMN analysis_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Adicionar analysis_score se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_score'
    ) THEN
        ALTER TABLE prestacoes_contas ADD COLUMN analysis_score INTEGER DEFAULT NULL;
    END IF;
    
    -- Adicionar extracted_data se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'extracted_data'
    ) THEN
        ALTER TABLE prestacoes_contas ADD COLUMN extracted_data JSONB DEFAULT NULL;
    END IF;
END $$;

-- 5. CRIAR ENUM PARA STATUS DE ANÁLISE
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status_enum') THEN
        CREATE TYPE analysis_status_enum AS ENUM (
            'pending',
            'processing', 
            'completed',
            'failed',
            'approved',
            'warnings',
            'high_issues',
            'critical_issues'
        );
    END IF;
END $$;

-- 6. ATUALIZAR COLUNA PARA USAR ENUM
-- Primeiro, remover o default atual
ALTER TABLE prestacoes_contas ALTER COLUMN analysis_status DROP DEFAULT;
-- Depois, alterar o tipo
ALTER TABLE prestacoes_contas ALTER COLUMN analysis_status TYPE analysis_status_enum USING analysis_status::analysis_status_enum;
-- Por fim, definir o novo default
ALTER TABLE prestacoes_contas ALTER COLUMN analysis_status SET DEFAULT 'pending'::analysis_status_enum;

-- 7. HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE financial_analysis ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE SEGURANÇA

-- Política para SELECT (usuários veem apenas análises dos seus condomínios)
CREATE POLICY "Users can view financial analysis of their condominiums" ON financial_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prestacoes_contas p
            JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id
            WHERE p.id = financial_analysis.prestacao_id
            AND auc.user_id = auth.uid()
        )
    );

-- Política para INSERT
CREATE POLICY "Users can insert financial analysis for their condominiums" ON financial_analysis
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM prestacoes_contas p
            JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id
            WHERE p.id = financial_analysis.prestacao_id
            AND auc.user_id = auth.uid()
        )
    );

-- Política para UPDATE
CREATE POLICY "Users can update financial analysis for their condominiums" ON financial_analysis
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM prestacoes_contas p
            JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id
            WHERE p.id = financial_analysis.prestacao_id
            AND auc.user_id = auth.uid()
        )
    );

-- 9. FUNÇÃO PARA BUSCAR PRÓXIMA ANÁLISE PENDENTE
CREATE OR REPLACE FUNCTION get_next_analysis_task()
RETURNS TABLE (
    prestacao_id UUID,
    condominio_id UUID,
    extracted_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as prestacao_id,
        p.condominio_id,
        p.extracted_data
    FROM prestacoes_contas p
    LEFT JOIN financial_analysis fa ON p.id = fa.prestacao_id
    WHERE p.extracted_data IS NOT NULL
    AND p.analysis_status = 'pending'::analysis_status_enum
    AND fa.id IS NULL
    ORDER BY p.created_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNÇÃO PARA BUSCAR ANÁLISE FINANCEIRA
CREATE OR REPLACE FUNCTION get_financial_analysis(prestacao_id UUID)
RETURNS TABLE (
    id UUID,
    prestacao_id UUID,
    validation_result JSONB,
    analyzed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fa.id,
        fa.prestacao_id,
        fa.validation_result,
        fa.analyzed_at,
        fa.metadata
    FROM financial_analysis fa
    WHERE fa.prestacao_id = get_financial_analysis.prestacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE financial_analysis IS 'Armazena resultados de análise e validação financeira de prestações de contas';
COMMENT ON COLUMN financial_analysis.validation_result IS 'Resultado completo da validação financeira em formato JSON';
COMMENT ON COLUMN financial_analysis.metadata IS 'Metadados do processamento (tempo, versão, etc.)';
COMMENT ON COLUMN financial_analysis.analyzed_at IS 'Timestamp de quando a análise foi executada';

-- 12. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON financial_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_analysis_task() TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_analysis(UUID) TO authenticated;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- VERIFICAÇÃO: Execute este SELECT para confirmar que tudo foi criado
SELECT 
    'financial_analysis' as tabela,
    COUNT(*) as registros
FROM financial_analysis
UNION ALL
SELECT 
    'prestacoes_contas com novos campos' as tabela,
    COUNT(*) as registros
FROM prestacoes_contas 
WHERE analysis_status IS NOT NULL;
