# Race Search & GPX Auto-Pull — Implementation Plan

## Overview

Transform the wizard Step 2 race name input into a typeahead search that auto-populates race details (distance, location, elevation, coordinates) from a curated registry of 400+ races. When a known race is selected, automatically fetch the GPX course file if available. Fall back to manual entry + GPX upload for unknown races.

---

## Architecture

### Data Layer: Race Registry

**New file: `src/data/race-registry.json`**

A curated, searchable registry of popular triathlon races combining:
- The existing 186 IRONMAN 70.3 races from `race-catalog.json` (with stats)
- ~30 major IRONMAN 140.6 races (Kona, Nice, Frankfurt, Hamburg, etc.)
- ~12 T100 Triathlon events (Singapore, San Francisco, Miami, London, etc.)
- ~20 Challenge Family races (Roth, Daytona, Cancun, etc.)
- ~10 popular sprint/olympic events

Each entry:
```json
{
  "id": "ironman-703-dubai",
  "name": "IRONMAN 70.3 Dubai",
  "series": "ironman",
  "distanceCategory": "70.3",
  "location": "Dubai, UAE",
  "country": "AE",
  "latitude": 25.2048,
  "longitude": 55.2708,
  "swimDistanceM": 1900,
  "bikeDistanceM": 90000,
  "runDistanceM": 21100,
  "bikeElevationGainM": 180,
  "runElevationGainM": 45,
  "gpx": {
    "bikeUrl": "https://ridewithgps.com/routes/XXXXX.gpx",
    "runUrl": null,
    "source": "ridewithgps"
  },
  "stats": {
    "totalAthletes": 3420,
    "medianFinishSec": 19800,
    "p10FinishSec": 15600,
    "p90FinishSec": 25200
  },
  "searchTerms": ["ironman", "dubai", "70.3", "uae", "middle east"],
  "active": true,
  "typicalMonth": 3
}
```

**Build script: `scripts/build-race-registry.ts`**

Node script that:
1. Reads `race-catalog.json` (186 IRONMAN 70.3 races with stats)
2. Merges in manually curated entries for 140.6, T100, Challenge, etc.
3. Geocodes locations → lat/lon (using a static lookup table, not an API)
4. Outputs `race-registry.json`

### API Layer

**New endpoint: `src/app/api/races/search/route.ts`**

- `GET /api/races/search?q=dubai&limit=10`
- Fuzzy search across name, location, series, searchTerms
- Returns top matches sorted by relevance (exact prefix match > contains > fuzzy)
- No auth required (public data)
- Response: `{ races: RaceRegistryEntry[] }`

**New endpoint: `src/app/api/races/[id]/gpx/route.ts`**

- `GET /api/races/ironman-703-dubai/gpx?segment=bike`
- Proxies GPX fetch from the stored URL (RideWithGPS, race website, etc.)
- Returns parsed `CourseData` (distance, elevation, points) — not raw GPX
- Caches result in memory (or future: in DB as RaceCourse record)
- Falls back to `{ available: false }` if no GPX exists for this race

### UI Layer

**New component: `src/components/wizard/race-search-combobox.tsx`**

Typeahead combobox that:
- Shows a search input with the existing MapPin icon
- Debounces input (300ms) → calls `/api/races/search?q=...`
- Displays dropdown with race name, location, distance badge, and median finish time
- Groups results by series (IRONMAN, T100, Challenge, Other)
- On selection: auto-fills name, distanceCategory, and stores the registry entry ID
- Allows free-text entry for races not in the registry ("Custom Race")
- Shows a subtle indicator when a race has GPX available

**Modified: `src/components/wizard/step-2-race.tsx`**

- Replace the plain `<Input>` for race name with `<RaceSearchCombobox>`
- When a registry race is selected:
  - Auto-set `distanceCategory` (disable the selector, show it as read-only)
  - Store `selectedRaceId` in wizard store (new field)
  - Show location + typical race month as helper text
- When "Custom Race" is chosen:
  - Distance selector stays editable
  - Manual flow as today

**Modified: `src/components/wizard/step-3-course.tsx`**

- If `selectedRaceId` is set and has GPX:
  - Auto-fetch GPX on mount → show "Loading course profile..." spinner
  - Display course summary (distance, elevation gain) when loaded
  - Show "Course auto-loaded from [source]" success message
  - Still allow manual GPX upload to override
- If no GPX available:
  - Show current manual upload UI
  - Remove the "Coming Soon" banner (it's here now!)

### Store Changes

**Modified: `src/stores/wizard-store.ts`**

Add to `RaceData`:
```typescript
selectedRaceId: string | null;    // registry ID if selected from search
raceLocation: string | null;      // auto-filled from registry
latitude: number | null;          // auto-filled from registry
longitude: number | null;         // auto-filled from registry
```

### Plan Generation Changes

**Modified: `src/app/actions/generate-plan.ts`**

- If `raceData.selectedRaceId` is provided:
  - Look up registry entry for elevation defaults (instead of hardcoded 600m/1200m)
  - Use registry lat/lon for weather fetch (instead of hardcoded Berlin coords)
  - Pass the race location to `buildFullContext` for course matching
- If GPX was auto-fetched (sent in formData as parsed CourseData):
  - Use it directly instead of parsing a File

---

## File Changes Summary

| File | Action | What |
|------|--------|------|
| `src/data/race-registry.json` | **CREATE** | Curated registry of 250+ races |
| `scripts/build-race-registry.ts` | **CREATE** | Build script merging catalog + manual data |
| `src/app/api/races/search/route.ts` | **CREATE** | Typeahead search API |
| `src/app/api/races/[id]/gpx/route.ts` | **CREATE** | GPX proxy/fetch API |
| `src/lib/race-registry.ts` | **CREATE** | Registry loader + search logic |
| `src/components/wizard/race-search-combobox.tsx` | **CREATE** | Typeahead combobox component |
| `src/stores/wizard-store.ts` | **MODIFY** | Add selectedRaceId, location, coords |
| `src/components/wizard/step-2-race.tsx` | **MODIFY** | Replace Input with combobox |
| `src/components/wizard/step-3-course.tsx` | **MODIFY** | Add GPX auto-fetch flow |
| `src/app/actions/generate-plan.ts` | **MODIFY** | Use registry data for defaults + coords |
| `docs/RACE_SEARCH_PLAN.md` | **CREATE** | This document |

---

## Implementation Order

1. **Race registry data** — Build the JSON with 250+ races (merge catalog + manual entries)
2. **Search library** — `race-registry.ts` with fuzzy search logic
3. **Search API** — `/api/races/search` endpoint
4. **Wizard store** — Add new fields
5. **Combobox component** — The typeahead UI
6. **Step 2 integration** — Wire combobox into the wizard
7. **GPX fetch API** — `/api/races/[id]/gpx` endpoint
8. **Step 3 integration** — Auto-fetch GPX when available
9. **Plan generation** — Use registry coords + elevation defaults
10. **Verification** — Build check, type check, manual test

---

## GPX Sources Strategy

### Tier 1: Curated URLs (immediate)
For the top ~50 most popular races, manually find and store GPX URLs from:
- RideWithGPS (many race organizers publish official routes here)
- Race websites (some offer downloadable GPX files)
- Strava segments (well-known course routes)

### Tier 2: RideWithGPS API (future enhancement)
- Search API: `GET /routes.json?search=ironman+dubai`
- Returns community-uploaded routes matching the search
- Can be added as a fallback when curated URL is missing

### Tier 3: Community uploads (future)
- Allow users to upload GPX for a race → store in DB
- Next user selecting same race gets auto-populated GPX
- Builds the library organically over time

---

## Search Algorithm

Simple but effective approach (no external search library needed):

```
score(query, race):
  1. Exact prefix match on name           → weight 100
  2. Word-start match on name words       → weight 80
  3. Contains match on name               → weight 60
  4. Match on location                    → weight 50
  5. Match on searchTerms array           → weight 40
  6. Match on series name                 → weight 30

Sort by: score DESC, totalAthletes DESC (popularity tiebreaker)
Limit: 8 results
```

Query is lowercased + split into tokens. Each token is scored independently and scores are summed.

---

## Notes

- No new database tables needed — registry is a static JSON file loaded at startup
- GPX URLs will be `null` for most races initially; the library grows over time
- The combobox supports both selection from results AND free-text custom entry
- All existing functionality (manual race name, manual GPX upload) remains as fallback
- The search is client→API→server-side (not client-side JSON loading) to keep bundle small
