/**
 * Race Registry — search and lookup for curated triathlon races
 *
 * Loads the static race-registry.json and provides fuzzy search capabilities
 * for the typeahead combobox in the wizard.
 */

import registryData from "@/data/race-registry.json";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RaceRegistryEntry {
  id: string;
  name: string;
  series: "ironman" | "ironman703" | "t100" | "challenge" | "other";
  distanceCategory: "sprint" | "olympic" | "70.3" | "140.6";
  location: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  swimDistanceM: number;
  bikeDistanceM: number;
  runDistanceM: number;
  bikeElevationGainM: number | null;
  runElevationGainM: number | null;
  gpx: {
    bikeUrl: string | null;
    runUrl: string | null;
    source: string | null;
  };
  stats: {
    totalAthletes: number;
    medianFinishSec: number | null;
    p10FinishSec: number | null;
    p90FinishSec: number | null;
  } | null;
  searchTerms: string[];
  active: boolean;
  typicalMonth: number | null;
}

export interface RaceSearchResult {
  race: RaceRegistryEntry;
  score: number;
}

// ─── Registry ───────────────────────────────────────────────────────────────

const registry: RaceRegistryEntry[] = registryData as RaceRegistryEntry[];

// Pre-compute lowercase name + searchTerms for faster matching
const indexedRaces = registry.map((race) => ({
  race,
  nameLower: race.name.toLowerCase(),
  nameWords: race.name.toLowerCase().split(/[\s/\-]+/),
  locationLower: race.location.toLowerCase(),
  termsJoined: race.searchTerms.join(" "),
}));

// ─── Search ─────────────────────────────────────────────────────────────────

/**
 * Search the race registry with a query string.
 * Returns scored results sorted by relevance.
 *
 * Scoring:
 *   - Exact prefix on name:       100 per token
 *   - Word-start match on name:    80 per token
 *   - Contains in name:            60 per token
 *   - Match on location:           50 per token
 *   - Match in searchTerms:        40 per token
 *   - Popularity bonus:          0-10 (based on total athletes)
 */
export function searchRaces(
  query: string,
  limit: number = 8,
): RaceSearchResult[] {
  if (!query || query.trim().length === 0) {
    // Return top races by popularity when no query
    return registry
      .filter((r) => r.active)
      .slice(0, limit)
      .map((race) => ({ race, score: race.stats?.totalAthletes || 0 }));
  }

  const queryLower = query.toLowerCase().trim();
  const tokens = queryLower.split(/\s+/).filter((t) => t.length > 0);

  const results: RaceSearchResult[] = [];

  for (const indexed of indexedRaces) {
    let score = 0;

    for (const token of tokens) {
      // 1. Exact prefix match on full name
      if (indexed.nameLower.startsWith(token)) {
        score += 100;
      }
      // 2. Word-start match (any word in the name starts with the token)
      else if (indexed.nameWords.some((w) => w.startsWith(token))) {
        score += 80;
      }
      // 3. Contains match on name
      else if (indexed.nameLower.includes(token)) {
        score += 60;
      }
      // 4. Location match
      else if (indexed.locationLower.includes(token)) {
        score += 50;
      }
      // 5. Search terms match
      else if (indexed.termsJoined.includes(token)) {
        score += 40;
      }
    }

    if (score > 0) {
      // Popularity bonus: up to 10 points for very popular races
      const athletes = indexed.race.stats?.totalAthletes || 0;
      const popularityBonus = Math.min(10, Math.floor(athletes / 500));
      score += popularityBonus;

      // Active race bonus
      if (indexed.race.active) {
        score += 5;
      }

      results.push({ race: indexed.race, score });
    }
  }

  // Sort by score desc, then by popularity desc
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aAthletes = a.race.stats?.totalAthletes || 0;
    const bAthletes = b.race.stats?.totalAthletes || 0;
    return bAthletes - aAthletes;
  });

  return results.slice(0, limit);
}

// ─── Lookup ─────────────────────────────────────────────────────────────────

/**
 * Get a race by its registry ID.
 */
export function getRaceById(id: string): RaceRegistryEntry | null {
  return registry.find((r) => r.id === id) || null;
}

/**
 * Get all races in the registry.
 */
export function getAllRaces(): RaceRegistryEntry[] {
  return registry;
}

/**
 * Format seconds as display time (e.g. "5:22:10")
 */
export function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Get the display label for a series.
 */
export function seriesLabel(
  series: RaceRegistryEntry["series"],
): string {
  switch (series) {
    case "ironman":
      return "IRONMAN";
    case "ironman703":
      return "IRONMAN 70.3";
    case "t100":
      return "T100";
    case "challenge":
      return "Challenge";
    case "other":
      return "Other";
  }
}
