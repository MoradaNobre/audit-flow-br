-- Add delete policies for admins and fix condominio creation

-- 1) Add DELETE policies for admins
CREATE POLICY "Admins can delete condominios" 
ON public.condominios 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete prestacoes" 
ON public.prestacoes_contas 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete relatorios" 
ON public.relatorios_auditoria 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');

-- 2) Fix condominio creation trigger to avoid conflicts
DROP TRIGGER IF EXISTS condominio_insert_trigger ON public.condominios;

CREATE OR REPLACE FUNCTION public.handle_condominio_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only link if no association exists yet
  INSERT INTO public.associacoes_usuarios_condominios (user_id, condominio_id, papel)
  VALUES (auth.uid(), NEW.id, 'administrador')
  ON CONFLICT (user_id, condominio_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER condominio_insert_trigger
  AFTER INSERT ON public.condominios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_condominio_insert();