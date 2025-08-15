-- Promote specific user to admin and fix role resolution priority

-- 1) Ensure get_user_role returns highest-precedence role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
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

-- 2) Give admin role to the requested user by email
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'
FROM auth.users u
WHERE lower(u.email) = lower('dna1973@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;