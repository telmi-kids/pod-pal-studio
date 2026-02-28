

## Concatenate All Section Recordings into a Final Podcast

### Overview
Add a "Build My Podcast" section at the bottom of the student preview that appears once all 5 sections have been recorded. This fetches each section's audio, concatenates them in order (intro, q1, q2, q3, goodbye) using the Web Audio API, and produces a single final recording. Students can preview it, save it, and still retake any individual section above.

### How It Works

1. **Completion check**: A banner at the bottom tracks progress (e.g., "3/5 sections recorded"). Once all 5 are done, the "Build My Podcast" button enables.

2. **Client-side concatenation**: When the student clicks "Build My Podcast":
   - Fetch all 5 audio files as ArrayBuffers
   - Decode each using `AudioContext.decodeAudioData()`
   - Create a single output buffer by appending all decoded buffers in order
   - Encode the result as a WAV blob using an offline AudioContext and a simple WAV encoder utility

3. **Preview and save**: The concatenated audio is shown as a playable preview. The student can then save it, which uploads the file to the `recordings` storage bucket and inserts a row in `recordings` with `section_key = "final"`.

4. **Re-doing sections**: If a student retakes any individual section after building the podcast, the final recording is cleared so they must rebuild it. This keeps the final output in sync.

### UI Design
```text
[Existing section cards with recorders...]

--- Final Podcast ---
Progress: 5/5 sections recorded [checkmarks]
[Build My Podcast] button (disabled until all 5 done)

[Audio player - final podcast preview]
[Save Final Podcast] [Rebuild]
```

### Technical Details

**New component: `src/components/FinalPodcastBuilder.tsx`**
- Props: `activityId`, `sectionRecordings` (the Record of recordings), `allSectionKeys` (ordered list of 5 keys)
- Uses Web Audio API to fetch, decode, and concatenate audio buffers
- Includes a simple WAV encoder (inline utility function) to produce a downloadable/playable blob
- Saves to storage bucket `recordings` with filename pattern `final-{activityId}-{timestamp}.wav`
- Inserts into `recordings` table with `section_key = "final"`

**Modified: `src/pages/ChildPreview.tsx`**
- Import and render `FinalPodcastBuilder` at the bottom of the page
- Pass the `sectionRecordings` state and ordered section keys
- When a section is re-recorded via `handleRecordingSaved`, clear any existing final recording from state

**No database or backend changes needed** -- uses existing `recordings` table and storage bucket.

### Files to Create/Modify
- **New**: `src/components/FinalPodcastBuilder.tsx` -- concatenation logic and UI
- **Modify**: `src/pages/ChildPreview.tsx` -- add the final podcast section at the bottom
