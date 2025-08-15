-- Fix RLS to allow creating condominios and user associations

-- Allow any authenticated user to INSERT new condominios
CREATE POLICY "Authenticated users can create condominios"
ON public.condominios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to create their own associations
CREATE POLICY "Users can create their own associations"
ON public.associacoes_usuarios_condominios
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);