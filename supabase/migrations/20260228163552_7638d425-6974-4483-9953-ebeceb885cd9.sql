-- Fix SELECT policies: any authenticated user can read activities and recordings
DROP POLICY IF EXISTS "Users can read own activities" ON public.activities;
CREATE POLICY "Authenticated users can read all activities"
  ON public.activities FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read own recordings" ON public.recordings;
CREATE POLICY "Authenticated users can read all recordings"
  ON public.recordings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix UPDATE on recordings: any authenticated user can update (for approval workflow)
DROP POLICY IF EXISTS "Users can update own recordings" ON public.recordings;
CREATE POLICY "Authenticated users can update recordings"
  ON public.recordings FOR UPDATE
  USING (auth.uid() IS NOT NULL);