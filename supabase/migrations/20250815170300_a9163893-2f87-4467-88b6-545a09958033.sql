-- Broaden insert policy to ensure authenticated users can insert
CREATE POLICY "Logged-in users can insert condominios"
ON public.condominios
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure role has insert privilege (RLS still applies)
GRANT INSERT ON public.condominios TO authenticated;