ALTER TABLE public.recordings 
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN rejection_comment text;

CREATE POLICY "Anyone can update recordings"
  ON public.recordings
  FOR UPDATE
  USING (true);