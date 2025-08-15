-- Configurar sistema de permissões para novos usuários

-- 1. Criar trigger para atribuir role básico a novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Inserir perfil do usuário
  INSERT INTO public.profiles (user_id, nome_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));
  
  -- Atribuir role básico (condomino) para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'condomino');
  
  RETURN NEW;
END;
$$;

-- 2. Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Atualizar políticas RLS para restringir ações de usuários básicos

-- Política para condominios - usuários básicos só podem visualizar
DROP POLICY IF EXISTS "Users can create condominios" ON public.condominios;
DROP POLICY IF EXISTS "Authenticated users can create condominios" ON public.condominios;

CREATE POLICY "Only admins can create condominios" 
ON public.condominios 
FOR INSERT 
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Política para prestacoes_contas - usuários básicos só podem visualizar
DROP POLICY IF EXISTS "Users can insert prestacoes for their condominios" ON public.prestacoes_contas;

CREATE POLICY "Only admins and auditors can create prestacoes" 
ON public.prestacoes_contas 
FOR INSERT 
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin', 'auditor']));

-- Política para associacoes - só admins podem criar associações
DROP POLICY IF EXISTS "Users can create their own associations" ON public.associacoes_usuarios_condominios;

CREATE POLICY "Only admins can create associations" 
ON public.associacoes_usuarios_condominios 
FOR INSERT 
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- 4. Criar função para verificar se usuário pode executar ações administrativas
CREATE OR REPLACE FUNCTION public.can_manage_condominios()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid()) = ANY (ARRAY['admin', 'auditor']);
$$;

CREATE OR REPLACE FUNCTION public.can_create_prestacoes()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid()) = ANY (ARRAY['admin', 'auditor']);
$$;