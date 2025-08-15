import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Condominio {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  created_at: string;
}

export const useCondominios = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['condominios', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Condominio[];
    },
    enabled: !!user,
  });
};

export const useCondominio = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['condominio', id, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Condominio;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateCondominio = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (condominio: Omit<Condominio, 'id' | 'created_at'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('condominios')
        .insert([condominio])
        .select()
        .single();

      if (error) throw error;

      // Create association between user and condominio
      const { error: associationError } = await supabase
        .from('associacoes_usuarios_condominios')
        .insert([{
          user_id: user.id,
          condominio_id: data.id,
          papel: 'administrador'
        }]);

      if (associationError) throw associationError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condominios'] });
    },
  });
};