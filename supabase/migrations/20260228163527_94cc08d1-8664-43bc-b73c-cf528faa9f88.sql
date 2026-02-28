-- Add user_id to activities
ALTER TABLE public.activities 
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to recordings
ALTER TABLE public.recordings 
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies on activities
DROP POLICY IF EXISTS "Anyone can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Anyone can read activities" ON public.activities;
DROP POLICY IF EXISTS "Anyone can update activities" ON public.activities;

-- New RLS policies for activities
CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own activities"
  ON public.activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE
  USING (auth.uid() = user_id);

-- Drop old permissive policies on recordings
DROP POLICY IF EXISTS "Anyone can insert recordings" ON public.recordings;
DROP POLICY IF EXISTS "Anyone can read recordings" ON public.recordings;
DROP POLICY IF EXISTS "Anyone can update recordings" ON public.recordings;

-- New RLS policies for recordings
CREATE POLICY "Users can insert own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
  ON public.recordings FOR UPDATE
  USING (auth.uid() = user_id);