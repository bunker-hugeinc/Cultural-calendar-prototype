# Cultural Calendar — Manual QA Checklist

Most bugs here compile fine but break at runtime (response-shape mismatches, stale
caches, dead components). Run this list locally (`npm run dev`) against the real
database after any change to feed / calendar / moment / pitch flows.

## Feed — discovery & search
- [ ] **Discover**: open Feed → "Discover New Moments" → new suggestions appear, no obvious duplicates.
- [ ] **No duplicates**: the pending list has no repeated/near-identical moments (e.g. only one "College Football Playoff").
- [ ] **AI search (existing)**: search a term that matches a moment already on the calendar → it appears under "On the calendar".
- [ ] **AI search (discovery)**: search a real event NOT in the DB (e.g. "Cincinnati Open") → it appears under "Discovered by AI" with a plausible date.
- [ ] **Add discovered**: click "+ Add to Calendar" on a discovered result → lands on the new moment page.

## Calendar — add & remove
- [ ] **Shows after add**: after adding a moment (via feed Evaluate & Add, or discovered search), go to Calendar → the moment is visible (timeline and grid).
- [ ] **Returns fresh**: switch away and back to the Calendar tab → list reflects latest (focus refetch).
- [ ] **Remove (grid)**: in grid view, hover a moment → click ✕ → confirm → it disappears and stays gone after reload.
- [ ] **Remove (detail)**: open a moment → "Remove" → returns to Calendar, moment gone.
- [ ] **Remove with pitches**: removing a moment that has pitches succeeds (no FK error) and its pitches are gone from the pitch list.

## Moment detail
- [ ] **Linked pitches**: a moment with pitches shows them all under "Partnership Pitches" with correct status; clicking one opens that pitch.
- [ ] **Generated detail persists**: score rationale / channel recs survive a reload.

## Pitch list
- [ ] **Real status**: statuses show Draft / Sent / Approved / Rejected correctly (not all "Draft").
- [ ] **Filter**: status filter tabs narrow the list and counts are right.
- [ ] **Delete**: trash icon on a row → confirm → pitch disappears and stays gone after reload.
- [ ] **Status propagation**: change a pitch's status in the editor → it reflects on the pitch list and dashboard.

## Pitch editor
- [ ] **Autosave**: edit a field, wait, reload → change persisted ("Saved" indicator, no "Save failed").
- [ ] **Back to list**: "← Pitches" returns to the list (no "not found").

## Data cleanup (one-time, optional)
- [ ] Dry run: `npx tsx scripts/dedupe-feed-candidates.ts` (prints what it would remove)
- [ ] Apply:   `npx tsx scripts/dedupe-feed-candidates.ts --apply`
