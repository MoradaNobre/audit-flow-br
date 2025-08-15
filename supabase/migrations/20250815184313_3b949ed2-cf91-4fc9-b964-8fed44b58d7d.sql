-- Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public) VALUES ('prestacoes-pdf', 'prestacoes-pdf', true);

-- Create RLS policies for the bucket
CREATE POLICY "Authenticated users can view PDF files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'prestacoes-pdf' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload PDF files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'prestacoes-pdf' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their uploaded files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'prestacoes-pdf' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete PDF files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'prestacoes-pdf' AND auth.uid() IS NOT NULL);