-- Restrict exposure of sensitive column `api_key_encrypted`
-- Revoke column-level privileges from client-facing roles
REVOKE SELECT (api_key_encrypted) ON TABLE public.admin_settings FROM anon, authenticated;
REVOKE UPDATE (api_key_encrypted) ON TABLE public.admin_settings FROM anon, authenticated;
REVOKE INSERT (api_key_encrypted) ON TABLE public.admin_settings FROM anon, authenticated;

-- Optional safety: ensure existing RLS still applies for other columns (no change needed)
-- Note: Edge functions using the service role remain unaffected and should use Supabase Secrets for API keys.
