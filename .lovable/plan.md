

## Teacher Voice Cloning and Question TTS

### Overview
When a teacher creates an activity with a voice recording, we clone their voice using ElevenLabs and generate audio for each question/section. These audio clips are saved and playable by students via speaker icons.

### Flow
```text
Teacher creates activity
  -> Voice brief uploaded to storage (existing)
  -> Edge function: clone voice from brief audio
  -> Edge function: generate TTS for intro, q1, q2, q3, goodbye
  -> Upload audio files to storage
  -> Save audio URLs to activity record

Student views activity
  -> Speaker icon next to each section
  -> Tap to play pre-generated audio in teacher's voice
```

### 1. ElevenLabs Setup
- Connect ElevenLabs via the connector (will prompt you to link your ElevenLabs account)
- The `ELEVENLABS_API_KEY` secret will be automatically available in edge functions

### 2. Database Changes
Add 5 new columns to `activities` table for storing generated audio URLs:
- `introduction_audio_url` (text, nullable)
- `question_1_audio_url` (text, nullable)
- `question_2_audio_url` (text, nullable)
- `question_3_audio_url` (text, nullable)
- `goodbye_audio_url` (text, nullable)

### 3. New Edge Function: `generate-voice-audio`
Single edge function that:
1. Receives: voice audio blob (base64), and the 5 text sections
2. Calls ElevenLabs "Add Voice" API to create a cloned voice from the teacher's recording
3. Calls ElevenLabs TTS API 5 times (intro, q1, q2, q3, goodbye) using the cloned voice
4. Uploads the 5 audio files to the `voices` storage bucket
5. Returns the 5 public URLs
6. Deletes the cloned voice from ElevenLabs (cleanup)

### 4. Frontend Changes

**`Index.tsx` -- handleSave**
- After saving the activity, if a voice recording exists, call the `generate-voice-audio` edge function
- Update the activity row with the returned audio URLs
- Show progress toast ("Generating teacher voice audio...")

**`ChildPreview.tsx` -- Speaker Icons**
- Add a small speaker/volume icon button next to each section card
- Only shown when the corresponding `*_audio_url` exists
- Tapping plays the audio, icon changes to indicate playing state
- One audio plays at a time (stop previous when starting new)

### 5. Technical Details

**Voice Cloning API call:**
```text
POST https://api.elevenlabs.io/v1/voices/add
- Form data with audio file + name
- Returns voice_id for TTS
```

**TTS API call (per section):**
```text
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
- Body: { text, model_id: "eleven_multilingual_v2" }
- Returns MP3 audio binary
```

**Cleanup:**
```text
DELETE https://api.elevenlabs.io/v1/voices/{voice_id}
- Removes cloned voice after audio generation
```

### Files to Create/Modify
- New migration: add 5 audio URL columns to `activities`
- New edge function: `supabase/functions/generate-voice-audio/index.ts`
- Update `supabase/config.toml`: add function config
- Modify `src/pages/Index.tsx`: call edge function after save
- Modify `src/pages/ChildPreview.tsx`: add speaker icons with playback

