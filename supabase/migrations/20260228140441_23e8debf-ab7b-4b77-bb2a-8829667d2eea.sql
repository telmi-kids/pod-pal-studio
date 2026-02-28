
-- Training materials table
CREATE TABLE public.training_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read training materials" ON public.training_materials FOR SELECT USING (true);
CREATE POLICY "Anyone can insert training materials" ON public.training_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete training materials" ON public.training_materials FOR DELETE USING (true);

-- Storage bucket for training materials
INSERT INTO storage.buckets (id, name, public) VALUES ('training-materials', 'training-materials', true);

CREATE POLICY "Public training materials access" ON storage.objects FOR SELECT USING (bucket_id = 'training-materials');
CREATE POLICY "Anyone can upload training materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'training-materials');
CREATE POLICY "Anyone can delete training materials" ON storage.objects FOR DELETE USING (bucket_id = 'training-materials');
