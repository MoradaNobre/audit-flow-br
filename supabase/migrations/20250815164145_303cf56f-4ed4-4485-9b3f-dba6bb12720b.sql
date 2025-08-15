-- EMERGENCY SECURITY FIX: Enable RLS and create secure policies

-- First, enable RLS on all tables
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestacoes_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inconsistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.associacoes_usuarios_condominios ENABLE ROW LEVEL SECURITY;

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user roles table with text role (instead of enum to avoid conflicts)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'condomino' CHECK (role IN ('admin', 'auditor', 'condomino')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_condominios(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT condominio_id FROM public.associacoes_usuarios_condominios WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION public.user_has_condominio_access(user_uuid UUID, cond_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.associacoes_usuarios_condominios 
    WHERE user_id = user_uuid AND condominio_id = cond_id
  );
$$;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for condominios table
CREATE POLICY "Users can view their associated condominios" 
ON public.condominios FOR SELECT 
USING (
  public.get_user_role(auth.uid()) = 'admin' OR 
  id IN (SELECT public.get_user_condominios(auth.uid()))
);

CREATE POLICY "Admins can manage all condominios" 
ON public.condominios FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for associacoes_usuarios_condominios table
CREATE POLICY "Users can view their own associations" 
ON public.associacoes_usuarios_condominios FOR SELECT 
USING (
  auth.uid() = user_id OR 
  public.get_user_role(auth.uid()) = 'admin'
);

CREATE POLICY "Admins can manage all associations" 
ON public.associacoes_usuarios_condominios FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for prestacoes_contas table
CREATE POLICY "Users can view prestacoes of their condominios" 
ON public.prestacoes_contas FOR SELECT 
USING (
  public.get_user_role(auth.uid()) = 'admin' OR 
  public.user_has_condominio_access(auth.uid(), condominio_id)
);

CREATE POLICY "Users can insert prestacoes for their condominios" 
ON public.prestacoes_contas FOR INSERT 
WITH CHECK (
  public.get_user_role(auth.uid()) = 'admin' OR 
  public.user_has_condominio_access(auth.uid(), condominio_id)
);

CREATE POLICY "Admins and auditors can update prestacoes" 
ON public.prestacoes_contas FOR UPDATE 
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'auditor') OR
  public.user_has_condominio_access(auth.uid(), condominio_id)
);

-- RLS Policies for relatorios_auditoria table
CREATE POLICY "Users can view audit reports of their condominios" 
ON public.relatorios_auditoria FOR SELECT 
USING (
  public.get_user_role(auth.uid()) = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.prestacoes_contas pc 
    WHERE pc.id = prestacao_id 
    AND public.user_has_condominio_access(auth.uid(), pc.condominio_id)
  )
);

CREATE POLICY "Admins and auditors can manage audit reports" 
ON public.relatorios_auditoria FOR ALL 
USING (public.get_user_role(auth.uid()) IN ('admin', 'auditor'));

-- RLS Policies for inconsistencias table
CREATE POLICY "Users can view inconsistencies of their condominios" 
ON public.inconsistencias FOR SELECT 
USING (
  public.get_user_role(auth.uid()) = 'admin' OR 
  EXISTS (
    SELECT 1 FROM public.relatorios_auditoria ra
    JOIN public.prestacoes_contas pc ON pc.id = ra.prestacao_id
    WHERE ra.id = relatorio_id 
    AND public.user_has_condominio_access(auth.uid(), pc.condominio_id)
  )
);

CREATE POLICY "Admins and auditors can manage inconsistencies" 
ON public.inconsistencias FOR ALL 
USING (public.get_user_role(auth.uid()) IN ('admin', 'auditor'));

-- Trigger function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'condomino');
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create profile and role on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();