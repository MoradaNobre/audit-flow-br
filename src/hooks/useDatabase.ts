import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RelatorioAuditoria {
  id: string;
  prestacao_id: string;
  resumo?: string;
  data_geracao: string;
  conteudo_gerado?: any;
}

export interface Inconsistencia {
  id: string;
  relatorio_id: string;
  descricao: string;
  tipo: 'financeira' | 'conformidade';
  nivel_criticidade: 'baixa' | 'media' | 'alta';
}

export const useRelatorio = (prestacaoId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['relatorio', prestacaoId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Buscar relatório
      const { data: relatorio, error: relatorioError } = await supabase
        .from('relatorios_auditoria')
        .select('*')
        .eq('prestacao_id', prestacaoId)
        .single();

      if (relatorioError) throw relatorioError;

      // Buscar inconsistências
      const { data: inconsistencias, error: inconsistenciasError } = await supabase
        .from('inconsistencias')
        .select('*')
        .eq('relatorio_id', relatorio.id);

      if (inconsistenciasError) throw inconsistenciasError;

      return {
        relatorio: relatorio as RelatorioAuditoria,
        inconsistencias: inconsistencias as Inconsistencia[]
      };
    },
    enabled: !!user && !!prestacaoId,
  });
};

export const useUserProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};