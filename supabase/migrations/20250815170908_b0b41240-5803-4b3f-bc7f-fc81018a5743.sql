-- Ensure creator automatically becomes administrador of new condominio
CREATE OR REPLACE FUNCTION public.handle_condominio_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Link the creator as administrador
  INSERT INTO public.associacoes_usuarios_condominios (user_id, condominio_id, papel)
  VALUES (auth.uid(), NEW.id, 'administrador')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_condominio_insert_link_creator ON public.condominios;
CREATE TRIGGER trig_condominio_insert_link_creator
AFTER INSERT ON public.condominios
FOR EACH ROW EXECUTE FUNCTION public.handle_condominio_insert();

-- Relax SELECT policy to also allow selecting condominios created by the user in the same txn if needed (via association created by trigger this should already pass)
-- But as a safeguard, add a permissive policy that allows selecting rows the user just inserted within the same transaction using EXISTS association
CREATE POLICY "Users can view newly created condominios"
ON public.condominios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.associacoes_usuarios_condominios auc
    WHERE auc.condominio_id = id AND auc.user_id = auth.uid()
  )
);