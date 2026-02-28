ALTER TABLE public.activities
  ADD COLUMN introduction_audio_url TEXT,
  ADD COLUMN question_1_audio_url TEXT,
  ADD COLUMN question_2_audio_url TEXT,
  ADD COLUMN question_3_audio_url TEXT,
  ADD COLUMN goodbye_audio_url TEXT;