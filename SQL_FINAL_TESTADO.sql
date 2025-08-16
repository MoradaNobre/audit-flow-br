-- =====================================================
-- SQL FINAL TESTADO PARA SUPABASE
-- Sistema de Validação Financeira - Fase 2.1
-- Versão corrigida e testada - SEM ERROS
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
    
    CONSTRAINT unique_prestacao_analysis UNIQUE(prestacao_id)
);

-- 2. CRIAR ÍNDICES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_financial_analysis_prestacao_id') THEN
        CREATE INDEX idx_financial_analysis_prestacao_id ON financial_analysis(prestacao_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_financial_analysis_analyzed_at') THEN
        CREATE INDEX idx_financial_analysis_analyzed_at ON financial_analysis(analyzed_at DESC);
    END IF;
END $$;

-- 3. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_financial_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_financial_analysis_updated_at ON financial_analysis;
CREATE TRIGGER trigger_update_financial_analysis_updated_at
    BEFORE UPDATE ON financial_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_analysis_updated_at();

-- 4. CRIAR ENUM
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

-- 5. ADICIONAR COLUNAS NA PRESTACOES_CONTAS
DO $$ 
BEGIN
    -- analysis_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_status'
    ) THEN
        ALTER TABLE prestacoes_contas ADD COLUMN analysis_status analysis_status_enum DEFAULT 'pending'::analysis_status_enum;
    END IF;
    
    -- analysis_score
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_score'
    ) THEN
        ALTER TABLE prestacoes_contas ADD COLUMN analysis_score INTEGER DEFAULT NULL;
    END IF;
    
    -- extracted_data
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'extracted_data'
    ) THEN
        ALTER TABLE prestacoes_contas ADD COLUMN extracted_data JSONB DEFAULT NULL;
    END IF;
END $$;

-- 6. RLS E POLÍTICAS
ALTER TABLE financial_analysis ENABLE ROW LEVEL SECURITY;

-- Dropar políticas existentes
DROP POLICY IF EXISTS "Users can view financial analysis of their condominiums" ON financial_analysis;
DROP POLICY IF EXISTS "Users can insert financial analysis for their condominiums" ON financial_analysis;
DROP POLICY IF EXISTS "Users can update financial analysis for their condominiums" ON financial_analysis;

-- Criar políticas
CREATE POLICY "Users can view financial analysis of their condominiums" ON financial_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prestacoes_contas p
            JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id
            WHERE p.id = financial_analysis.prestacao_id
            AND auc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert financial analysis for their condominiums" ON financial_analysis
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM prestacoes_contas p
            JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id
            WHERE p.id = financial_analysis.prestacao_id
            AND auc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update financial analysis for their condominiums" ON financial_analysis
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM prestacoes_contas p
            JOIN associacoes_usuarios_condominios auc ON p.condominio_id = auc.condominio_id
            WHERE p.id = financial_analysis.prestacao_id
            AND auc.user_id = auth.uid()
        )
    );

-- 7. FUNÇÕES
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

CREATE OR REPLACE FUNCTION get_financial_analysis(p_prestacao_id UUID)
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
    WHERE fa.prestacao_id = p_prestacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON financial_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_analysis_task() TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_analysis(UUID) TO authenticated;

-- 9. COMENTÁRIOS
COMMENT ON TABLE financial_analysis IS 'Resultados de análise e validação financeira';
COMMENT ON COLUMN financial_analysis.validation_result IS 'Resultado da validação em JSON';
COMMENT ON COLUMN financial_analysis.metadata IS 'Metadados do processamento';

-- 10. VERIFICAÇÃO FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Script executado com sucesso!';
    RAISE NOTICE '📊 Tabela financial_analysis: %', 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_analysis') 
        THEN 'CRIADA' ELSE 'ERRO' END;
    RAISE NOTICE '🔧 Enum analysis_status_enum: %', 
        CASE WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status_enum') 
        THEN 'CRIADO' ELSE 'ERRO' END;
    RAISE NOTICE '📋 Colunas adicionadas: %', 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_status') 
        THEN 'OK' ELSE 'ERRO' END;
END $$;

-- Consulta de verificação
SELECT 
    'financial_analysis' as tabela,
    COUNT(*) as registros,
    'Pronta para uso' as status
FROM financial_analysis;

-- =====================================================
-- FIM - SCRIPT TESTADO E FUNCIONANDO
-- =====================================================
