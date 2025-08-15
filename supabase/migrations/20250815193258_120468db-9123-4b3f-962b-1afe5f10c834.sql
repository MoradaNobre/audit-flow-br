-- Corrigir o enum de nível de criticidade para aceitar as variações corretas
ALTER TYPE criticism_level RENAME TO criticism_level_old;

CREATE TYPE criticism_level AS ENUM ('baixa', 'baixo', 'media', 'médio', 'medio', 'alta', 'alto');

-- Atualizar a tabela para usar o novo tipo
ALTER TABLE inconsistencias 
ALTER COLUMN nivel_criticidade TYPE criticism_level 
USING nivel_criticidade::text::criticism_level;