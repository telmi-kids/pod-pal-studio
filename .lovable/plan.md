

## Replace Year-in-Title with Age Group Filter

### What Changes

Instead of embedding the year group into generated activity topic titles, we'll add an age group dropdown filter alongside the existing search bar. The edge function prompt will be reverted to generate clean topic titles without year group prefixes.

### Changes

**`src/components/StepActivities.tsx`**
- Add a Select dropdown next to the search bar for filtering by age group (e.g., "All Ages", "5-7", "8-10", "11-13", "14-16")
- Update the `filtered` logic to apply both the text search AND the age group filter
- Extract unique age groups from the loaded activities to populate the dropdown dynamically

**`supabase/functions/generate-curriculum-activities/index.ts`**
- Update the system prompt to NOT include the year/age group in the topic title -- just generate clean, descriptive topic names (e.g., "Ancient Egypt" not "Ancient Egypt - Year 4")

### Technical Details

**StepActivities filtering logic:**
```
const filtered = activities
  .filter(a => !ageFilter || ageFilter === "all" || a.age_group === ageFilter)
  .filter(a => !searchQuery.trim() || a.topic.toLowerCase().includes(searchQuery.toLowerCase()));
```

**UI layout:** The search bar and age group filter will sit side by side -- search input taking most of the width, age group Select on the right.

