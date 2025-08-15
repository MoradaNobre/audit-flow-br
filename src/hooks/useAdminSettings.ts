import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminSettings {
  id: string;
  llm_provider: 'openai' | 'gemini';
  llm_model: string;
  created_at: string;
  updated_at: string;
}

export const useAdminSettings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AdminSettings | null;
    },
    enabled: !!user,
  });
};

export const useUpsertAdminSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: { llm_provider: 'openai' | 'gemini'; llm_model: string }) => {
      const { data, error } = await supabase
        .from('admin_settings')
        .upsert(values, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as AdminSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });
};