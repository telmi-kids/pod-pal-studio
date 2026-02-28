

## Podcast Submission Approval Workflow

### Overview
When students submit their final podcast, it goes into a "pending" state. Teachers can then review submissions and either approve them (making them visible in the playlist) or reject them with a comment.

### Database Changes

Add two new columns to the `recordings` table:
- `status` (text, default `'pending'`) -- values: `pending`, `approved`, `rejected`
- `rejection_comment` (text, nullable)

Also add an UPDATE RLS policy so recordings can be updated (for approval/rejection).

### UI Changes

**Student View (`PodcastPlaylist.tsx`)**
- Only show recordings where `status = 'approved'` in the playlist
- After submitting, show a message like "Your podcast has been submitted for approval!"

**Teacher Review Section**
- Create a new component `src/components/SubmissionReview.tsx`
- Shows two tabs: "Pending" and "Approved"
- Each pending card shows: student name, audio player, Approve button, Reject button
- Clicking Reject opens a small text input for a comment before confirming
- Approved tab shows the approved recordings

**Integration in Teacher View (`StepQuestions.tsx` or `Index.tsx`)**
- When viewing an existing activity, add a "Submissions" section below the questions that renders `SubmissionReview` with the activity ID

### File Changes

| File | Action |
|------|--------|
| Database migration | Add `status` and `rejection_comment` columns, UPDATE policy |
| `src/components/SubmissionReview.tsx` | New -- teacher review UI with pending/approved tabs |
| `src/components/PodcastPlaylist.tsx` | Filter to only show `approved` recordings |
| `src/components/FinalPodcastBuilder.tsx` | Show "pending approval" message after submit |
| `src/components/StepQuestions.tsx` | Add SubmissionReview section for existing activities |

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.recordings 
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN rejection_comment text;

CREATE POLICY "Anyone can update recordings"
  ON public.recordings
  FOR UPDATE
  USING (true);
```

**SubmissionReview component:**
- Fetches recordings where `section_key = 'final'` for the activity
- Uses Tabs component with "Pending" and "Approved" tabs
- Pending tab: cards with audio player + Approve/Reject buttons
- Reject flow: inline text input for comment, then confirm
- On approve: `UPDATE recordings SET status = 'approved' WHERE id = ...`
- On reject: `UPDATE recordings SET status = 'rejected', rejection_comment = '...' WHERE id = ...`

**PodcastPlaylist changes:**
- Add `.eq("status", "approved")` to the query filter

