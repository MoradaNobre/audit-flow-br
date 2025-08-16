import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InconsistenciaRow {
  id: string;
  relatorio_id: string;
  descricao: string;
  tipo: 'financeira' | 'conformidade';
  nivel_criticidade: 'baixa' | 'media' | 'alta';
}

export const useInconsistenciasByRelatorio = (relatorioId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inconsistencias', relatorioId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (!relatorioId) throw new Error('Relatório inválido');

      const { data, error } = await supabase
        .from('inconsistencias')
        .select('id, relatorio_id, descricao, tipo, nivel_criticidade')
        .eq('relatorio_id', relatorioId)
        .order('id', { ascending: true });

      if (error) throw error;
      return (data || []) as InconsistenciaRow[];
    },
    enabled: !!user && !!relatorioId,
  });
};
