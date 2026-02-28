

## Three New Features

### Feature 1: Collapse sections after final podcast is built

In `ChildPreview.tsx`, restructure the layout:
- Move `FinalPodcastBuilder` to appear right after the topic header (and teacher brief), before the section cards
- Wrap all section recording cards (introduction, Q1-Q3, goodbye) in a Radix `Collapsible` component
- Default the collapsible to **collapsed** when `sectionRecordings["final"]` exists, and **open** otherwise
- Add a "Show/Hide Recording Sections" toggle button using `CollapsibleTrigger`
- Import from `@/components/ui/collapsible` (already exists in the project)

### Feature 2: Podcast Playlist per activity

Create a new component `src/components/PodcastPlaylist.tsx`:
- Accepts `activityId` as a prop
- Fetches all recordings where `section_key = 'final'` for that activity, ordered newest first
- Displays each as a styled card with:
  - Avatar circle with student initials (from `student_name` column, fallback to "Student")
  - Student name and formatted timestamp
  - A styled audio player
  - Soft colored background per card (rotating through kid-blue, kid-pink, kid-green, accent)
- Shows empty state if no final recordings exist yet

Integrate into `ChildPreview.tsx` below the `FinalPodcastBuilder` component.

### Feature 3: Copy/share activity links

**In `StepActivities.tsx`:**
- Add a small copy/share icon button on each activity card
- On click (with `stopPropagation` to prevent navigation), copy `window.location.origin + "/preview/" + activity.id` to clipboard
- Show a toast confirming the link was copied

**In `ChildPreview.tsx`:**
- Add a "Copy Link" button in the header bar (next to "Student View" label)
- Same clipboard copy logic with toast

### Technical Summary

| File | Action |
|------|--------|
| `src/components/PodcastPlaylist.tsx` | Create new component |
| `src/pages/ChildPreview.tsx` | Reorder layout, add Collapsible, add PodcastPlaylist, add share button |
| `src/components/StepActivities.tsx` | Add share/copy button to activity cards |

No database or backend changes needed -- uses existing `recordings` table with `section_key = 'final'` filter and existing `student_name` column.

