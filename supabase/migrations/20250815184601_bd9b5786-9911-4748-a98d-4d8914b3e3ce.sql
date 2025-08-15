-- SECURITY FIX: Remove the sensitive api_key_encrypted column entirely
-- API keys should be stored in Supabase Secrets, not in database tables

-- Drop the column completely to eliminate the security risk
ALTER TABLE public.admin_settings DROP COLUMN IF EXISTS api_key_encrypted;

-- Add a comment explaining the security decision
COMMENT ON TABLE public.admin_settings IS 
'LLM configuration settings. API keys are stored securely in Supabase Secrets, not in this table for security reasons.';

-- Ensure only admins can manage these settings with explicit RLS policies
DROP POLICY IF EXISTS "Only admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can view settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.admin_settings;

-- Create new, more explicit policies
CREATE POLICY "Admin-only SELECT on admin_settings" 
ON public.admin_settings 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin-only INSERT on admin_settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin-only UPDATE on admin_settings" 
ON public.admin_settings 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admin-only DELETE on admin_settings" 
ON public.admin_settings 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin');