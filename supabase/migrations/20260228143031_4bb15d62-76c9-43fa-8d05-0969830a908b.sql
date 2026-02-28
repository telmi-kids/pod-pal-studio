
-- Create recordings table
CREATE TABLE public.recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  student_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Anyone can read recordings" ON public.recordings
  FOR SELECT USING (true);

-- Public insert policy
CREATE POLICY "Anyone can insert recordings" ON public.recordings
  FOR INSERT WITH CHECK (true);

-- Create recordings storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true);

-- Allow public uploads to recordings bucket
CREATE POLICY "Anyone can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings');

-- Allow public reads from recordings bucket
CREATE POLICY "Anyone can read recordings files" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings');
