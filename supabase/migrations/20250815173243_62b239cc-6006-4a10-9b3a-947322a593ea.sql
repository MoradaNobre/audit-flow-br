-- Create admin settings table for LLM configuration
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  llm_provider TEXT NOT NULL DEFAULT 'openai',
  llm_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  api_key_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Only admins can manage settings" 
ON public.admin_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Insert default settings
INSERT INTO public.admin_settings (llm_provider, llm_model)
VALUES ('gemini', 'gemini-2.0-flash-exp');