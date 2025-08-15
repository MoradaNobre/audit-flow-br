-- Função para obter informações de arquivos do storage e atualizar tamanhos
DO $$
DECLARE
    prestacao_record RECORD;
    arquivo_info RECORD;
BEGIN
    -- Para cada prestação que tem arquivo_url mas não tem arquivo_tamanho
    FOR prestacao_record IN 
        SELECT id, arquivo_url 
        FROM prestacoes_contas 
        WHERE arquivo_url IS NOT NULL 
        AND arquivo_tamanho IS NULL
    LOOP
        -- Buscar informações do arquivo no storage
        SELECT metadata->>'size' as size_text
        INTO arquivo_info
        FROM storage.objects 
        WHERE name = prestacao_record.arquivo_url 
        AND bucket_id = 'prestacoes-pdf';
        
        -- Se encontrou o arquivo, atualizar o tamanho
        IF arquivo_info.size_text IS NOT NULL AND arquivo_info.size_text != '' THEN
            UPDATE prestacoes_contas 
            SET arquivo_tamanho = arquivo_info.size_text::bigint
            WHERE id = prestacao_record.id;
            
            RAISE NOTICE 'Atualizado tamanho para prestação % com arquivo %: % bytes', 
                prestacao_record.id, prestacao_record.arquivo_url, arquivo_info.size_text;
        END IF;
    END LOOP;
END
$$;