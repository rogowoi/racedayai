# Mobile UX Fix Plan

Based on the UX review, here are all fixes organized by priority.

---

## Critical (Blocks core flow)

### B1: Wizard buttons overflow off-screen on mobile
**Files:** `step-2-race.tsx`, `step-3-course.tsx`
**Root cause:** The button container uses `flex gap-3` with two `w-full` buttons, but the `size="lg"` on the primary button makes it taller — not wider. Looking at the wizard layout, content is in `max-w-md mx-auto p-4`. The buttons themselves look correct in code (both `w-full`), so the overflow is likely caused by the outer `space-y-6` div not being constrained. Need to add `overflow-hidden` or `min-w-0` to the flex children, and ensure the button container uses `w-full` explicitly.
**Fix:** Add `min-w-0` to both buttons in the flex container (prevents flex items from overflowing), and wrap button text with `truncate` if needed. Also ensure the outer div has `overflow-x-hidden`.

### B2: "Failed to generate plan" with no context
**Files:** `step-3-course.tsx`, `api/plans/generate/route.ts`
**Root cause:** The API returns specific error messages (401, 403, 400), but the catch block in Step 3 falls back to generic "Failed to generate plan". The error display is a single red line.
**Fix:** Improve the error display to show:
- The actual error message from the API
- Actionable guidance (e.g., "Please sign in", "Check your form data")
- A "Try Again" button to retry

---

## High (Significant UX impact)

### B3: Page layout breaks after scrolling to Generate Plan
**Files:** `step-3-course.tsx` or `wizard-layout.tsx`
**Root cause:** Likely the content overflow from the form being wider than `max-w-md` container due to RWGPS results or long text. The `max-w-md mx-auto` on wizard layout should constrain this, but child elements might overflow.
**Fix:** Add `overflow-x-hidden` to the wizard layout main content area and ensure all child elements respect container width with `min-w-0` on flex items.

### B4: Race date resets on back navigation
**Files:** `step-2-race.tsx`, `wizard-store.ts`
**Root cause:** The date `<Input type="date">` doesn't set its `value` prop from the store. It only writes to the store `onChange` but never reads back. When re-mounting after back navigation, the input shows empty.
**Fix:** Set the `value` prop on the date input: `value={raceData.date ? new Date(raceData.date).toISOString().split('T')[0] : ''}`. The Zustand persist middleware serializes Date as string, so we need to handle that.

---

## Medium

### B5: Missing space "strongand"
**File:** `before-after.tsx` line 10-12
**Root cause:** `<br className="hidden sm:block" />` — on mobile the `<br>` is hidden, so "strong" and "and" run together because JSX strips the whitespace between the line break and the next text node.
**Fix:** Add explicit space: `finishing strong{" "}` before the `<br>`, or restructure to ensure space is always present.

### B6: Unicode escape `\u2013` showing as raw text
**File:** `features.tsx` line 60
**Root cause:** `15\u201330` — the `\u2013` IS valid JavaScript unicode escape and should render as an en-dash. This is likely a false positive in the review OR it's inside a JSX text node where the backslash is getting double-escaped. Need to verify — if it's raw in JSX, replace with `{"\u2013"}` or use the HTML entity `&ndash;`.
**Fix:** Replace `\u2013` with the actual en-dash character `–` directly in the string, or use `{"–"}` in JSX.

### B7: Missing space "line.We"
**File:** `features.tsx` lines 53-56
**Root cause:** Same pattern as B5 — `<br className="hidden sm:block" />` hides on mobile, "line." and "We" run together.
**Fix:** Add explicit space after the period, e.g., `start line.{" "}` before the `<br>`.

### B8: Date format is European (dd.mm.yyyy)
**File:** `step-2-race.tsx`
**Root cause:** Native `<input type="date">` uses browser locale for display format. This is browser behavior, not a code bug.
**Fix:** No code change needed — the native date picker respects the user's system locale. Can add a small hint text below the field showing the expected format.

### B9: Known race doesn't auto-fill date
**Files:** `step-2-race.tsx`, `race-search-combobox.tsx`, `api/races/search/route.ts`
**Root cause:** The race registry only stores `typicalMonth` (number), not an exact race date. The `handleRaceSelect` callback doesn't set the date. The search API returns `typicalMonth` but the combobox doesn't pass it through.
**Fix:** Pass `typicalMonth` from the combobox selection, and in `handleRaceSelect`, compute a reasonable default date (e.g., the 1st of that month in the next occurrence of that month) and pre-fill the date field. Show hint text like "Typical month: March — please confirm exact date."

---

## Low

### B10: Theme color inconsistency (Step 1 orange vs Steps 2-3 blue)
**File:** `wizard-layout.tsx`
**Root cause:** The progress bar uses `bg-primary` which is consistent. The step indicator text also uses the same styling. This is likely a perceived difference from Step 1 content (orange CTA button) vs Steps 2-3 (blue primary buttons). This is actually consistent — primary color is used throughout.
**Fix:** No change needed unless the user confirms a specific element that's wrong. The `bg-primary` is the same across all steps.

### B11: RWGPS results show wrong distances
**File:** `step-3-course.tsx`
**Root cause:** RWGPS search returns whatever matches the query text, not filtered by expected distance. The expected 90km bike course shows 40km, 35km results.
**Fix:** Add distance filtering/sorting — when `raceData.distanceCategory` is known, sort RWGPS results by proximity to the expected bike distance (e.g., 90km for 70.3). Show a badge highlighting results close to expected distance.

---

## Implementation Order

1. **B5, B6, B7** — Landing page text fixes (5 min, easy wins)
2. **B4** — Date field persistence (10 min)
3. **B1** — Button overflow fix (15 min)
4. **B3** — Layout overflow fix (10 min, same root cause as B1)
5. **B2** — Better error messages (15 min)
6. **B9** — Auto-fill date from typicalMonth (20 min)
7. **B11** — RWGPS distance filtering (15 min)
