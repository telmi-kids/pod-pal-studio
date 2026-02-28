
-- Activities table (public, no auth needed for kids)
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  age_group TEXT NOT NULL,
  genre TEXT NOT NULL,
  introduction TEXT,
  question_1 TEXT,
  question_2 TEXT,
  question_3 TEXT,
  goodbye TEXT,
  voice_url TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS - public access for kids (no auth)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update activities" ON public.activities FOR UPDATE USING (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('voices', 'voices', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policies
CREATE POLICY "Public voice access" ON storage.objects FOR SELECT USING (bucket_id = 'voices');
CREATE POLICY "Anyone can upload voices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voices');
CREATE POLICY "Public document access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Anyone can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
