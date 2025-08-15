import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_user_role', {
        user_uuid: user.id,
      });
      if (error) throw error;
      return (data as string) ?? null;
    },
    enabled: !!user,
  });
};

export const useIsAdmin = () => {
  const { data: role } = useUserRole();
  return role === 'admin';
};