-- =====================================================
-- SQL SEGURO PARA COPIAR E COLAR NO SUPABASE
-- Sistema de Validação Financeira - Fase 2.1
-- Versão que trata erros de enum e colunas existentes
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

-- 2. CRIAR ÍNDICES PARA PERFORMANCE (apenas se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_financial_analysis_prestacao_id') THEN
        CREATE INDEX idx_financial_analysis_prestacao_id ON financial_analysis(prestacao_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_financial_analysis_analyzed_at') THEN
        CREATE INDEX idx_financial_analysis_analyzed_at ON financial_analysis(analyzed_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_financial_analysis_validation_score') THEN
        CREATE INDEX idx_financial_analysis_validation_score ON financial_analysis USING GIN ((validation_result->'score'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_financial_analysis_health') THEN
        CREATE INDEX idx_financial_analysis_health ON financial_analysis USING GIN ((validation_result->'summary'->'overallHealth'));
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

-- Dropar trigger se existir e recriar
DROP TRIGGER IF EXISTS trigger_update_financial_analysis_updated_at ON financial_analysis;
CREATE TRIGGER trigger_update_financial_analysis_updated_at
    BEFORE UPDATE ON financial_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_analysis_updated_at();

-- 4. CRIAR ENUM PARA STATUS DE ANÁLISE (apenas se não existir)
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

-- 5. ADICIONAR CAMPOS NA TABELA PRESTACOES_CONTAS (versão segura)
DO $$ 
BEGIN
    -- Adicionar analysis_status se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_status'
    ) THEN
        -- Adicionar como enum diretamente
        ALTER TABLE prestacoes_contas ADD COLUMN analysis_status analysis_status_enum DEFAULT 'pending'::analysis_status_enum;
    ELSE
        -- Se já existe como TEXT, converter para enum
        BEGIN
            -- Remover default atual
            ALTER TABLE prestacoes_contas ALTER COLUMN analysis_status DROP DEFAULT;
            -- Alterar tipo
            ALTER TABLE prestacoes_contas ALTER COLUMN analysis_status TYPE analysis_status_enum USING 
                CASE 
                    WHEN analysis_status = 'pendente' THEN 'pending'::analysis_status_enum
                    WHEN analysis_status = 'processando' THEN 'processing'::analysis_status_enum
                    WHEN analysis_status = 'concluido' THEN 'completed'::analysis_status_enum
                    WHEN analysis_status = 'erro' THEN 'failed'::analysis_status_enum
                    ELSE 'pending'::analysis_status_enum
                END;
            -- Definir novo default
            ALTER TABLE prestacoes_contas ALTER COLUMN analysis_status SET DEFAULT 'pending'::analysis_status_enum;
        EXCEPTION
            WHEN OTHERS THEN
                -- Se der erro, apenas continuar (coluna já pode estar no formato correto)
                RAISE NOTICE 'Coluna analysis_status já existe ou erro na conversão: %', SQLERRM;
        END;
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

-- 6. HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE financial_analysis ENABLE ROW LEVEL SECURITY;

-- 7. DROPAR POLÍTICAS EXISTENTES (se existirem) E RECRIAR
DROP POLICY IF EXISTS "Users can view financial analysis of their condominiums" ON financial_analysis;
DROP POLICY IF EXISTS "Users can insert financial analysis for their condominiums" ON financial_analysis;
DROP POLICY IF EXISTS "Users can update financial analysis for their condominiums" ON financial_analysis;

-- 8. CRIAR POLÍTICAS DE SEGURANÇA

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

-- 9. FUNÇÕES AUXILIARES

-- Função para buscar próxima análise pendente
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

-- Função para buscar análise financeira
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

-- 10. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE financial_analysis IS 'Armazena resultados de análise e validação financeira de prestações de contas';
COMMENT ON COLUMN financial_analysis.validation_result IS 'Resultado completo da validação financeira em formato JSON';
COMMENT ON COLUMN financial_analysis.metadata IS 'Metadados do processamento (tempo, versão, etc.)';
COMMENT ON COLUMN financial_analysis.analyzed_at IS 'Timestamp de quando a análise foi executada';

-- 11. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON financial_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_analysis_task() TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_analysis(UUID) TO authenticated;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
    -- Verificar tabela
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_analysis') THEN
        RAISE NOTICE '✅ Tabela financial_analysis criada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Tabela financial_analysis não foi criada';
    END IF;
    
    -- Verificar enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status_enum') THEN
        RAISE NOTICE '✅ Enum analysis_status_enum criado com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Enum analysis_status_enum não foi criado';
    END IF;
    
    -- Verificar colunas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestacoes_contas' AND column_name = 'analysis_status') THEN
        RAISE NOTICE '✅ Coluna analysis_status adicionada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Coluna analysis_status não foi adicionada';
    END IF;
    
    -- Verificar funções
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_financial_analysis') THEN
        RAISE NOTICE '✅ Função get_financial_analysis criada com sucesso';
    ELSE
        RAISE NOTICE '❌ Erro: Função get_financial_analysis não foi criada';
    END IF;
END $$;

-- Consulta final para verificar estrutura
SELECT 
    'financial_analysis' as tabela,
    COUNT(*) as registros,
    'Tabela criada e pronta para uso' as status
FROM financial_analysis
UNION ALL
SELECT 
    'prestacoes_contas' as tabela,
    COUNT(*) as registros,
    'Colunas adicionadas com sucesso' as status
FROM prestacoes_contas 
WHERE analysis_status IS NOT NULL;

-- =====================================================
-- FIM DO SCRIPT SEGURO
-- =====================================================
