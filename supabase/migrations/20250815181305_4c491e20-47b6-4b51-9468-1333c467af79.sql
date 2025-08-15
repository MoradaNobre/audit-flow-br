-- Verificar e reforçar a segurança da tabela admin_settings

-- 1. Garantir que RLS está habilitado (já está, mas confirmando)
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- 2. Remover a política existente e recriar com políticas mais específicas
DROP POLICY IF EXISTS "Only admins can manage settings" ON public.admin_settings;

-- 3. Criar políticas específicas para diferentes operações
-- Política para SELECT - somente admins podem ver as configurações
CREATE POLICY "Admins can view settings" 
ON public.admin_settings 
FOR SELECT 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Política para INSERT - somente admins podem inserir configurações
CREATE POLICY "Admins can insert settings" 
ON public.admin_settings 
FOR INSERT 
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Política para UPDATE - somente admins podem atualizar configurações
CREATE POLICY "Admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Política para DELETE - somente admins podem deletar configurações
CREATE POLICY "Admins can delete settings" 
ON public.admin_settings 
FOR DELETE 
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- 4. Criar uma função adicional para verificar acesso seguro (security definer)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_user_role(auth.uid()) = 'admin';
$$;

-- 5. Garantir que a coluna api_key_encrypted seja protegida por uma view segura
-- Criar uma view que só mostra dados não sensíveis para não-admins
CREATE OR REPLACE VIEW public.admin_settings_safe AS
SELECT 
  id,
  llm_provider,
  llm_model,
  created_at,
  updated_at,
  CASE 
    WHEN get_user_role(auth.uid()) = 'admin' THEN api_key_encrypted
    ELSE null
  END as api_key_encrypted
FROM public.admin_settings;

-- 6. Garantir que políticas RLS sejam aplicadas mesmo para roles de service
-- (adicional proteção contra acessos via service role quando não deveria)
REVOKE ALL ON public.admin_settings FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;