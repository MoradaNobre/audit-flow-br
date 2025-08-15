-- Create a function to get all users with their details for admin access
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  user_id UUID,
  nome_completo TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  role TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.nome_completo,
    p.created_at,
    COALESCE(ur.role, 'condomino') as role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permission to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

-- Create RLS policy for the function if needed
-- The function already has SECURITY DEFINER so it runs with elevated privileges