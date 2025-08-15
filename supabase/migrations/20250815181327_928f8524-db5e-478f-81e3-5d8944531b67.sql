-- Corrigir os problemas de segurança detectados pelo linter

-- 1. Remover a view com SECURITY DEFINER que foi flagrada como problema
DROP VIEW IF EXISTS public.admin_settings_safe;

-- 2. Corrigir a função is_admin_user para incluir search_path
DROP FUNCTION IF EXISTS public.is_admin_user();

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid()) = 'admin';
$$;

-- 3. Verificar se a função get_user_role também precisa de search_path
-- (Se ela não tiver, vamos adicionar)
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = user_uuid AND ur.role = 'admin'
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = user_uuid AND ur.role = 'auditor'
    ) THEN 'auditor'
    ELSE 'condomino'
  END;
$$;