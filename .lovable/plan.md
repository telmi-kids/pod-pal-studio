

## Submit Podcast with Student Name + Reset Flow

### What Changes

After building a podcast, the "Save Final Podcast" button becomes a "Submit to Playlist" flow that:
1. Shows a name input field so the student can enter their name
2. On submit, saves the recording with the student name, adds it to the playlist immediately, and resets all section recordings so the next student can start fresh

### Changes

**`src/components/FinalPodcastBuilder.tsx`**
- Add a `studentName` state field
- After build completes (preview shown), replace the current "Save Final Podcast" button with:
  - A text input for the student's name (placeholder "Enter your name")
  - A "Submit to Playlist" button
- Update `saveFinal` to include `student_name` in the database insert
- After successful save, reset `finalBlobUrl`, `finalBlob`, and `studentName` state

**`src/pages/ChildPreview.tsx`**
- Update `handleRecordingSaved` so that when `section_key === "final"`:
  - Clear ALL section recordings (reset the map to empty) so sections reopen for the next student
  - Refresh the playlist (already done via `playlistKey`)
  - Sections will auto-open since no recordings exist anymore

### Flow

1. Student records all 5 sections -> sections auto-collapse, "Build My Podcast" enabled
2. Student clicks "Build My Podcast" -> preview audio appears
3. Student enters their name and clicks "Submit to Playlist"
4. Recording saved with name, playlist refreshes, all sections reset for next student

### Technical Details

- The `saveFinal` function will pass `student_name: studentName.trim() || "Student"` in the insert
- On successful save, the `onFinalSaved` callback triggers `handleRecordingSaved` which will clear `sectionRecordings` to `{}`, causing `sectionsOpen` to reopen and progress to reset
- The `FinalPodcastBuilder` internally resets its own blob state after save
