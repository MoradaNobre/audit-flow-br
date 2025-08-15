import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RelatorioAuditoria {
  id: string;
  prestacao_id: string;
  resumo?: string;
  conteudo_gerado?: any;
  data_geracao: string;
}

export const useRelatorios = (condominioId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['relatorios', condominioId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('relatorios_auditoria')
        .select(`
          *,
          prestacoes_contas!inner(
            condominio_id,
            mes_referencia,
            ano_referencia
          )
        `)
        .order('data_geracao', { ascending: false });

      if (condominioId) {
        query = query.eq('prestacoes_contas.condominio_id', condominioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RelatorioAuditoria[];
    },
    enabled: !!user,
  });
};

export const useRelatorio = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['relatorio', id, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('relatorios_auditoria')
        .select(`
          *,
          prestacoes_contas!inner(
            condominio_id,
            mes_referencia,
            ano_referencia,
            arquivo_url,
            condominios!inner(nome)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Relatório não encontrado');
      return data as RelatorioAuditoria;
    },
    enabled: !!user && !!id,
  });
};

export const useDeleteRelatorio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('relatorios_auditoria')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
    },
  });
};