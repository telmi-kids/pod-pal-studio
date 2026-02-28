

## Student Recording Mode

### Overview
Add a "Student Mode" toggle to the Activity Bank that switches the view so clicking an activity navigates directly to the student recording page. Recordings will be saved to storage and tracked in a new database table, with past recordings displayed on the student activity page.

### Database Changes

**New table: `recordings`**
- `id` (uuid, PK, default gen_random_uuid())
- `activity_id` (uuid, FK to activities.id, not null)
- `recording_url` (text, not null)
- `student_name` (text, nullable -- for future use)
- `created_at` (timestamptz, default now())
- RLS: public read/insert (no auth, matching existing pattern)

**New storage bucket: `recordings`** (public)

### UI Changes

**1. StepActivities.tsx -- Student Mode Toggle**
- Add a toggle/switch in the header area (e.g. "Student Mode" with a Switch component)
- When student mode is ON:
  - Hide the "New" and "Settings" buttons
  - Change header to "🎙️ Choose Your Activity"
  - Clicking a card navigates to `/preview/:id` instead of opening teacher view

**2. ChildPreview.tsx -- Save & Display Recordings**
- After recording, show a "Save Recording" button that:
  - Uploads the blob to the `recordings` bucket
  - Inserts a row into the `recordings` table with the activity_id and public URL
  - Shows a success toast
- Below the recording section, display a list of past recordings for this activity fetched from the `recordings` table, each with an audio player and timestamp

### Technical Details

```text
Activity Bank
  +------------------+
  | [Toggle: Student Mode]
  |                  |
  | Teacher Mode:    |  Student Mode:
  |  click -> view   |   click -> /preview/:id
  |  questions       |   (recording page)
  +------------------+

ChildPreview (/preview/:id)
  - Record -> Save to storage + DB
  - List past recordings from DB
```

**Files to modify:**
- `supabase/migrations/` -- new migration for `recordings` table + storage bucket
- `src/components/StepActivities.tsx` -- add student mode toggle, conditional navigation
- `src/pages/ChildPreview.tsx` -- add save logic, fetch & display past recordings
- `src/pages/Index.tsx` -- minor updates if needed for student mode state

