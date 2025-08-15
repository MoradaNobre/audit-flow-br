-- Fix security warnings from the linter

-- Update functions to include search_path for security
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_condominios(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT condominio_id FROM public.associacoes_usuarios_condominios WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.user_has_condominio_access(user_uuid UUID, cond_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.associacoes_usuarios_condominios 
    WHERE user_id = user_uuid AND condominio_id = cond_id
  );
$$;