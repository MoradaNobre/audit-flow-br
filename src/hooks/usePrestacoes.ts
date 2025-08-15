import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PrestacaoContas {
  id: string;
  condominio_id: string;
  mes_referencia: number;
  ano_referencia: number;
  status_analise: 'pendente' | 'processando' | 'concluido' | 'erro';
  arquivo_url?: string;
  uploaded_by?: string;
  created_at: string;
}

export const usePrestacoes = (condominioId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prestacoes', condominioId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('prestacoes_contas')
        .select('*')
        .order('created_at', { ascending: false });

      if (condominioId) {
        query = query.eq('condominio_id', condominioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PrestacaoContas[];
    },
    enabled: !!user,
  });
};

export const useCreatePrestacao = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prestacao: {
      condominio_id: string;
      mes_referencia: number;
      ano_referencia: number;
      arquivo_url?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('prestacoes_contas')
        .insert([{
          ...prestacao,
          uploaded_by: user.id,
          status_analise: 'pendente'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestacoes'] });
    },
  });
};

export const useUpdatePrestacaoStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PrestacaoContas['status_analise'] }) => {
      const { data, error } = await supabase
        .from('prestacoes_contas')
        .update({ status_analise: status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prestacoes'] });
    },
  });
};