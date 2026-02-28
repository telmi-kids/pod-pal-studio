

## Curriculum Bulk Generation and Activity Search

### Overview
Add two major features: (1) a curriculum upload in Settings that generates 10 activities in one click, and (2) a search bar in the Activity Bank that filters activities and offers a quick-create shortcut when no results match.

### Feature 1: Curriculum Bulk Generator (Settings Page)

A new section on the Settings page lets teachers upload a curriculum document (PDF, TXT, etc.) and generate 10 activities from it.

**How it works:**
- New section in `Settings.tsx` below training materials: "Generate Activities from Curriculum"
- Teacher uploads a curriculum file and enters an age group
- On click "Generate 10 Activities", a new edge function `generate-curriculum-activities` is called
- The edge function reads the curriculum content, sends it to the AI gateway, and uses tool calling to return 10 activities (each with topic, genre, introduction, 3 questions, goodbye)
- The frontend inserts all 10 activities into the `activities` table (without voice URLs since no teacher voice is used)
- A toast confirms success, and the teacher can navigate to the Activity Bank to see them

**New edge function: `supabase/functions/generate-curriculum-activities/index.ts`**
- Accepts: curriculum text (or base64 for PDF), age group
- Uses Lovable AI (gemini-3-flash-preview) with tool calling to return an array of 10 activity objects
- Each object contains: topic, genre, introduction, question_1, question_2, question_3, goodbye

### Feature 2: Activity Search Bar

A search bar at the top of the Activity Bank filters activities by topic text.

**How it works:**
- Add a search input in `StepActivities.tsx` between the header and the student mode toggle
- Filter activities client-side using case-insensitive substring match on the `topic` field
- When the search has text but zero results match, show a "Create Activity" button
- Clicking it calls `onNew()` but also passes the search query as a pre-filled topic
- The `StepForm` component accepts an optional `initialTopic` prop to pre-populate the topic input

### Feature 3: Edit Existing Activity Questions

Currently, viewing an existing activity shows the questions but the edit/pencil buttons only appear when `onSave` is provided (only for new activities). We need to allow editing saved activities too.

**How it works:**
- In `Index.tsx`, when selecting an existing activity, pass an `onSave` handler that updates the existing row (via Supabase UPDATE) instead of inserting a new one
- The `StepQuestions` component already supports editing fields with pencil icons -- this just requires wiring up the save action for existing activities

### Technical Details

**Files to create:**
- `supabase/functions/generate-curriculum-activities/index.ts` -- new edge function for bulk AI generation

**Files to modify:**
- `src/pages/Settings.tsx` -- add curriculum upload section with age group selector and generate button
- `src/components/StepActivities.tsx` -- add search bar, filtered display, and "Create" button for empty results
- `src/components/StepForm.tsx` -- accept optional `initialTopic` prop
- `src/pages/Index.tsx` -- pass `initialTopic` from search query to StepForm; add update handler for existing activities so questions are editable and saveable
- `supabase/config.toml` -- add the new edge function entry

**No database changes needed** -- uses existing `activities` table structure.
