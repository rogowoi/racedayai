/**
 * Build Race Registry
 *
 * Merges the existing race-catalog.json (186 IRONMAN 70.3 races) with manually
 * curated entries for IRONMAN 140.6, T100, Challenge Family, and other popular
 * triathlon races. Outputs a unified race-registry.json for typeahead search.
 *
 * Usage: npx tsx scripts/build-race-registry.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Types ──────────────────────────────────────────────────────────────────

interface RaceRegistryEntry {
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

interface CatalogEntry {
  event_location: string;
  metadata: {
    raw_name: string;
    is_championship: boolean;
    location: string;
    event_type: string;
  };
  stats: {
    total_athletes: number;
    years: number[];
    year_range: {
      first: number;
      last: number;
      consistency_pct: number;
      type: string;
    };
    finish_time: {
      median_sec: number;
      mean_sec: number;
      p10_sec: number;
      p90_sec: number;
      min_sec: number;
      max_sec: number;
      stdev_sec: number;
      median_display: string;
      mean_display: string;
      p10_display: string;
      p90_display: string;
    };
    segments: {
      swim: { median_sec: number; mean_sec: number; pct_of_total: number };
      bike: { median_sec: number; mean_sec: number; pct_of_total: number };
      run: { median_sec: number; mean_sec: number; pct_of_total: number };
    };
    demographics: {
      gender: { M: number; F: number; counts: { M: number; F: number } };
      age_groups: Record<string, { count: number; pct: number }>;
    };
    country_iso2: string;
  };
}

// ─── Geocoding Lookup ───────────────────────────────────────────────────────
// Static lat/lon for major triathlon cities (no API needed)

const GEO_LOOKUP: Record<string, { lat: number; lon: number; country: string }> = {
  // IRONMAN 70.3 locations
  "Aarhus": { lat: 56.1629, lon: 10.2039, country: "DK" },
  "Alagoas": { lat: -9.5713, lon: -35.8073, country: "BR" },
  "Alcudia-Mallorca": { lat: 39.8533, lon: 3.1214, country: "ES" },
  "Arizona": { lat: 33.4152, lon: -111.8315, country: "US" },
  "Asia-Pacific": { lat: -33.8688, lon: 151.2093, country: "AU" },
  "Asia-Pacific / Auckland": { lat: -36.8485, lon: 174.7633, country: "NZ" },
  "Asia-Pacific Championship Western Sydney": { lat: -33.8066, lon: 150.7716, country: "AU" },
  "Athens": { lat: 37.9838, lon: 23.7275, country: "GR" },
  "Augusta": { lat: 33.4710, lon: -81.9748, country: "US" },
  "Austin": { lat: 30.2672, lon: -97.7431, country: "US" },
  "Austria / St. Polten": { lat: 48.2043, lon: 15.6229, country: "AT" },
  "Ballarat": { lat: -37.5622, lon: 143.8503, country: "AU" },
  "Barcelona": { lat: 41.3874, lon: 2.1686, country: "ES" },
  "Bariloche": { lat: -41.1335, lon: -71.3103, country: "AR" },
  "Bintan": { lat: 1.0692, lon: 104.4559, country: "ID" },
  "Boulder": { lat: 40.0150, lon: -105.2705, country: "US" },
  "Buenos Aires": { lat: -34.6037, lon: -58.3816, country: "AR" },
  "Busselton": { lat: -33.6445, lon: 115.3499, country: "AU" },
  "Cairns": { lat: -16.9186, lon: 145.7781, country: "AU" },
  "Calgary": { lat: 51.0447, lon: -114.0719, country: "CA" },
  "California": { lat: 33.6189, lon: -117.9298, country: "US" },
  "Campeche": { lat: 19.8301, lon: -90.5349, country: "MX" },
  "Cascais": { lat: 38.6979, lon: -9.4215, country: "PT" },
  "Cebu": { lat: 10.3157, lon: 123.8854, country: "PH" },
  "Chattanooga": { lat: 35.0456, lon: -85.3097, country: "US" },
  "Coeur d'Alene": { lat: 47.6777, lon: -116.7805, country: "US" },
  "Colombo": { lat: 6.9271, lon: 79.8612, country: "LK" },
  "Costa Rica": { lat: 10.0162, lon: -84.2140, country: "CR" },
  "Da Nang": { lat: 16.0544, lon: 108.2022, country: "VN" },
  "Davao": { lat: 7.1907, lon: 125.4553, country: "PH" },
  "Des Moines": { lat: 41.5868, lon: -93.6250, country: "US" },
  "Dubai": { lat: 25.2048, lon: 55.2708, country: "AE" },
  "Eagleman": { lat: 38.5976, lon: -76.0794, country: "US" },
  "Ecuador": { lat: -2.1710, lon: -79.9224, country: "EC" },
  "Edinburgh": { lat: 55.9533, lon: -3.1883, country: "GB" },
  "Elsinore": { lat: 56.0341, lon: 12.6116, country: "DK" },
  "Europe": { lat: 48.2082, lon: 16.3738, country: "AT" },
  "Finland": { lat: 61.4978, lon: 23.7610, country: "FI" },
  "Florianopolis": { lat: -27.5954, lon: -48.5480, country: "BR" },
  "Geelong": { lat: -38.1499, lon: 144.3617, country: "AU" },
  "Goa": { lat: 15.2993, lon: 74.1240, country: "IN" },
  "Guangzhou": { lat: 23.1291, lon: 113.2644, country: "CN" },
  "Gulf Coast": { lat: 30.3944, lon: -86.4958, country: "US" },
  "Gurye": { lat: 35.2026, lon: 127.4585, country: "KR" },
  "Hamburg": { lat: 53.5511, lon: 9.9937, country: "DE" },
  "Hefei": { lat: 31.8206, lon: 117.2272, country: "CN" },
  "Indian Wells - La Quinta": { lat: 33.7238, lon: -116.3052, country: "US" },
  "Jönköping": { lat: 57.7826, lon: 14.1618, country: "SE" },
  "Kraichgau": { lat: 49.1540, lon: 8.7930, country: "DE" },
  "Korea": { lat: 35.2026, lon: 127.4585, country: "KR" },
  "Liuzhou": { lat: 24.3264, lon: 109.4281, country: "CN" },
  "Luxembourg": { lat: 49.6116, lon: 6.1319, country: "LU" },
  "Mandurah": { lat: -32.5269, lon: 115.7217, country: "AU" },
  "Mar del Plata": { lat: -38.0055, lon: -57.5426, country: "AR" },
  "Marbella": { lat: 36.5099, lon: -4.8862, country: "ES" },
  "Melbourne": { lat: -37.8136, lon: 144.9631, country: "AU" },
  "Miami": { lat: 25.7617, lon: -80.1918, country: "US" },
  "Middle East Championship Bahrain": { lat: 26.0667, lon: 50.5577, country: "BH" },
  "Mooloolaba": { lat: -26.6847, lon: 153.1189, country: "AU" },
  "Monterrey": { lat: 25.6866, lon: -100.3161, country: "MX" },
  "Mont-Tremblant": { lat: 46.2096, lon: -74.5858, country: "CA" },
  "Musselman": { lat: 42.8680, lon: -76.9856, country: "US" },
  "New Orleans": { lat: 29.9511, lon: -90.0715, country: "US" },
  "Nice": { lat: 43.7102, lon: 7.2620, country: "FR" },
  "Oceanside": { lat: 33.1959, lon: -117.3795, country: "US" },
  "Ohio": { lat: 40.3442, lon: -82.4377, country: "US" },
  "Oregon": { lat: 44.9429, lon: -123.0351, country: "US" },
  "Palawan": { lat: 10.2000, lon: 118.9000, country: "PH" },
  "Panama": { lat: 8.9824, lon: -79.5199, country: "PA" },
  "Philippines": { lat: 14.5995, lon: 120.9842, country: "PH" },
  "Port Elizabeth": { lat: -33.9608, lon: 25.6022, country: "ZA" },
  "Port Macquarie": { lat: -31.4306, lon: 152.9087, country: "AU" },
  "Pucon": { lat: -39.2823, lon: -71.9545, country: "CL" },
  "Punta del Este": { lat: -34.9667, lon: -54.9500, country: "UY" },
  "Racine": { lat: 42.7261, lon: -87.7829, country: "US" },
  "Ruegen": { lat: 54.3696, lon: 13.3964, country: "DE" },
  "Salalah": { lat: 17.0199, lon: 54.0920, country: "OM" },
  "Salzburg / Zell am See": { lat: 47.3229, lon: 12.7988, country: "AT" },
  "Santa Cruz": { lat: 36.9741, lon: -122.0308, country: "US" },
  "Santa Rosa": { lat: 38.4405, lon: -122.7144, country: "US" },
  "Sarasota": { lat: 27.3364, lon: -82.5307, country: "US" },
  "Silverman": { lat: 36.1699, lon: -115.1398, country: "US" },
  "South African Championship": { lat: -33.9608, lon: 25.6022, country: "ZA" },
  "South American Championship Buenos Aires": { lat: -34.6037, lon: -58.3816, country: "AR" },
  "Sri Lanka": { lat: 7.8731, lon: 80.7718, country: "LK" },
  "Staffordshire": { lat: 52.7790, lon: -1.8255, country: "GB" },
  "Steelhead": { lat: 43.2250, lon: -86.2482, country: "US" },
  "St. George": { lat: 37.0965, lon: -113.5684, country: "US" },
  "Subic Bay": { lat: 14.7892, lon: 120.2814, country: "PH" },
  "Sunshine Coast": { lat: -26.6500, lon: 153.0667, country: "AU" },
  "Superfrog": { lat: 32.5875, lon: -117.1286, country: "US" },
  "Syracuse": { lat: 43.0481, lon: -76.1474, country: "US" },
  "Taiwan": { lat: 22.9997, lon: 120.2270, country: "TW" },
  "Taupo": { lat: -38.6857, lon: 176.0702, country: "NZ" },
  "Texas": { lat: 30.0849, lon: -95.4177, country: "US" },
  "Thailand": { lat: 12.9236, lon: 100.8825, country: "TH" },
  "Timberman": { lat: 43.5284, lon: -71.4687, country: "US" },
  "Turkey": { lat: 36.8969, lon: 30.7133, country: "TR" },
  "Victoria": { lat: 48.4284, lon: -123.3656, country: "CA" },
  "Vietnam": { lat: 16.0544, lon: 108.2022, country: "VN" },
  "Vichy": { lat: 46.1272, lon: 3.4269, country: "FR" },
  "Waco": { lat: 31.5493, lon: -97.1467, country: "US" },
  "Weymouth": { lat: 50.6097, lon: -2.4559, country: "GB" },
  "Western Australia": { lat: -33.6445, lon: 115.3499, country: "AU" },
  "Western Sydney": { lat: -33.8066, lon: 150.7716, country: "AU" },
  "Xiamen": { lat: 24.4798, lon: 118.0894, country: "CN" },
  "Zell am See": { lat: 47.3229, lon: 12.7988, country: "AT" },
  "Zell am See-Kaprun": { lat: 47.3229, lon: 12.7988, country: "AT" },
  // World Championship locations
  "World Championship": { lat: 43.7102, lon: 7.2620, country: "FR" },
  "World Championship Sunshine Coast": { lat: -26.6500, lon: 153.0667, country: "AU" },
  "World Championship Taupo": { lat: -38.6857, lon: 176.0702, country: "NZ" },
  // ── IRONMAN 140.6 locations ──
  "Kona": { lat: 19.6400, lon: -155.9969, country: "US" },
  "Frankfurt": { lat: 50.1109, lon: 8.6821, country: "DE" },
  "Lanzarote": { lat: 28.9638, lon: -13.5477, country: "ES" },
  "Lake Placid": { lat: 44.2795, lon: -73.9799, country: "US" },
  "Wisconsin": { lat: 43.0731, lon: -89.4012, country: "US" },
  "Cozumel": { lat: 20.4318, lon: -86.9203, country: "MX" },
  "Cairns 140.6": { lat: -16.9186, lon: 145.7781, country: "AU" },
  "Copenhagen": { lat: 55.6761, lon: 12.5683, country: "DK" },
  "Florida": { lat: 30.1766, lon: -85.8055, country: "US" },
  "Vitoria-Gasteiz": { lat: 42.8469, lon: -2.6716, country: "ES" },
  "Bolton": { lat: 53.5785, lon: -2.4299, country: "GB" },
  "Tulsa": { lat: 36.1540, lon: -95.9928, country: "US" },
  "Maryland": { lat: 38.3299, lon: -75.6091, country: "US" },
  "Kalmar": { lat: 56.6634, lon: 16.3566, country: "SE" },
  "Emilia-Romagna": { lat: 44.4949, lon: 11.3426, country: "IT" },
  // ── T100 locations ──
  "San Francisco": { lat: 37.7749, lon: -122.4194, country: "US" },
  "Singapore": { lat: 1.3521, lon: 103.8198, country: "SG" },
  "London": { lat: 51.5074, lon: -0.1278, country: "GB" },
  "Las Vegas": { lat: 36.1699, lon: -115.1398, country: "US" },
  "Ibiza": { lat: 38.9067, lon: 1.4206, country: "ES" },
  // ── Challenge Family locations ──
  "Roth": { lat: 49.2475, lon: 11.0912, country: "DE" },
  "Daytona": { lat: 29.2108, lon: -81.0228, country: "US" },
  "Cancun": { lat: 21.1619, lon: -86.8515, country: "MX" },
  "Wanaka": { lat: -44.7032, lon: 169.1321, country: "NZ" },
  "Almere": { lat: 52.3508, lon: 5.2647, country: "NL" },
  "Samorin": { lat: 47.9994, lon: 17.3086, country: "SK" },
  "Fuerteventura": { lat: 28.3587, lon: -14.0538, country: "ES" },
  "Peguera-Mallorca": { lat: 39.5316, lon: 2.4495, country: "ES" },
  "Gran Canaria": { lat: 27.9202, lon: -15.5474, country: "ES" },
  "Rimini": { lat: 44.0678, lon: 12.5695, country: "IT" },
  "Sanremo": { lat: 43.8159, lon: 7.7763, country: "IT" },
  "Walchsee": { lat: 47.6500, lon: 12.3167, country: "AT" },
  "Cape Town": { lat: -33.9249, lon: 18.4241, country: "ZA" },
};

// ─── Manually Curated Races ────────────────────────────────────────────────

const IRONMAN_FULL_RACES: Omit<RaceRegistryEntry, "id">[] = [
  {
    name: "IRONMAN World Championship Kona",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Kailua-Kona, Hawaii, USA",
    country: "US",
    latitude: 19.6400,
    longitude: -155.9969,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1700,
    runElevationGainM: 400,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 5000, medianFinishSec: 43200, p10FinishSec: 34200, p90FinishSec: 56700 },
    searchTerms: ["kona", "world championship", "hawaii", "ironman", "full"],
    active: true,
    typicalMonth: 10,
  },
  {
    name: "IRONMAN World Championship Nice",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Nice, France",
    country: "FR",
    latitude: 43.7102,
    longitude: 7.2620,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 2500,
    runElevationGainM: 300,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 3000, medianFinishSec: 46800, p10FinishSec: 36000, p90FinishSec: 57600 },
    searchTerms: ["nice", "world championship", "france", "ironman", "full"],
    active: true,
    typicalMonth: 9,
  },
  {
    name: "IRONMAN Frankfurt",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Frankfurt, Germany",
    country: "DE",
    latitude: 50.1109,
    longitude: 8.6821,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1000,
    runElevationGainM: 150,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 3500, medianFinishSec: 42600, p10FinishSec: 33600, p90FinishSec: 54000 },
    searchTerms: ["frankfurt", "germany", "european championship", "ironman", "full"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "IRONMAN Hamburg",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Hamburg, Germany",
    country: "DE",
    latitude: 53.5511,
    longitude: 9.9937,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 200,
    runElevationGainM: 50,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 3000, medianFinishSec: 41400, p10FinishSec: 32400, p90FinishSec: 52200 },
    searchTerms: ["hamburg", "germany", "ironman", "full", "flat"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "IRONMAN Lanzarote",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Lanzarote, Spain",
    country: "ES",
    latitude: 28.9638,
    longitude: -13.5477,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 2500,
    runElevationGainM: 500,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2000, medianFinishSec: 48600, p10FinishSec: 37800, p90FinishSec: 59400 },
    searchTerms: ["lanzarote", "spain", "canary islands", "ironman", "full", "hilly"],
    active: true,
    typicalMonth: 5,
  },
  {
    name: "IRONMAN Lake Placid",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Lake Placid, New York, USA",
    country: "US",
    latitude: 44.2795,
    longitude: -73.9799,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1800,
    runElevationGainM: 450,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 44100, p10FinishSec: 35400, p90FinishSec: 55800 },
    searchTerms: ["lake placid", "new york", "usa", "ironman", "full"],
    active: true,
    typicalMonth: 7,
  },
  {
    name: "IRONMAN Wisconsin",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Madison, Wisconsin, USA",
    country: "US",
    latitude: 43.0731,
    longitude: -89.4012,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1500,
    runElevationGainM: 300,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2800, medianFinishSec: 43800, p10FinishSec: 34800, p90FinishSec: 55200 },
    searchTerms: ["wisconsin", "madison", "usa", "ironman", "full"],
    active: true,
    typicalMonth: 9,
  },
  {
    name: "IRONMAN Cozumel",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Cozumel, Mexico",
    country: "MX",
    latitude: 20.4318,
    longitude: -86.9203,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 100,
    runElevationGainM: 30,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 3000, medianFinishSec: 42000, p10FinishSec: 33000, p90FinishSec: 54000 },
    searchTerms: ["cozumel", "mexico", "ironman", "full", "flat"],
    active: true,
    typicalMonth: 11,
  },
  {
    name: "IRONMAN Cairns",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Cairns, Australia",
    country: "AU",
    latitude: -16.9186,
    longitude: 145.7781,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1200,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2000, medianFinishSec: 44100, p10FinishSec: 35100, p90FinishSec: 56700 },
    searchTerms: ["cairns", "australia", "asia pacific", "ironman", "full"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "IRONMAN Copenhagen",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Copenhagen, Denmark",
    country: "DK",
    latitude: 55.6761,
    longitude: 12.5683,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 300,
    runElevationGainM: 100,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 3000, medianFinishSec: 42600, p10FinishSec: 33600, p90FinishSec: 54000 },
    searchTerms: ["copenhagen", "denmark", "ironman", "full", "flat"],
    active: true,
    typicalMonth: 8,
  },
  {
    name: "IRONMAN Florida",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Panama City Beach, Florida, USA",
    country: "US",
    latitude: 30.1766,
    longitude: -85.8055,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 150,
    runElevationGainM: 50,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 3000, medianFinishSec: 42000, p10FinishSec: 33000, p90FinishSec: 54000 },
    searchTerms: ["florida", "panama city", "usa", "ironman", "full", "flat", "fast"],
    active: true,
    typicalMonth: 11,
  },
  {
    name: "IRONMAN Vitoria-Gasteiz",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Vitoria-Gasteiz, Spain",
    country: "ES",
    latitude: 42.8469,
    longitude: -2.6716,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1800,
    runElevationGainM: 350,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 45000, p10FinishSec: 36000, p90FinishSec: 57600 },
    searchTerms: ["vitoria", "spain", "basque", "ironman", "full"],
    active: true,
    typicalMonth: 7,
  },
  {
    name: "IRONMAN Bolton",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Bolton, UK",
    country: "GB",
    latitude: 53.5785,
    longitude: -2.4299,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 2000,
    runElevationGainM: 500,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 46800, p10FinishSec: 37800, p90FinishSec: 57600 },
    searchTerms: ["bolton", "uk", "england", "ironman", "full", "hilly"],
    active: true,
    typicalMonth: 7,
  },
  {
    name: "IRONMAN Tulsa",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Tulsa, Oklahoma, USA",
    country: "US",
    latitude: 36.1540,
    longitude: -95.9928,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 800,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 43200, p10FinishSec: 34200, p90FinishSec: 55800 },
    searchTerms: ["tulsa", "oklahoma", "usa", "ironman", "full"],
    active: true,
    typicalMonth: 5,
  },
  {
    name: "IRONMAN Maryland",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Cambridge, Maryland, USA",
    country: "US",
    latitude: 38.3299,
    longitude: -75.6091,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 300,
    runElevationGainM: 100,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 42600, p10FinishSec: 33600, p90FinishSec: 54000 },
    searchTerms: ["maryland", "cambridge", "usa", "ironman", "full", "flat"],
    active: true,
    typicalMonth: 10,
  },
  {
    name: "IRONMAN Kalmar",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Kalmar, Sweden",
    country: "SE",
    latitude: 56.6634,
    longitude: 16.3566,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 400,
    runElevationGainM: 100,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2000, medianFinishSec: 42600, p10FinishSec: 33600, p90FinishSec: 54000 },
    searchTerms: ["kalmar", "sweden", "ironman", "full", "flat"],
    active: true,
    typicalMonth: 8,
  },
  {
    name: "IRONMAN Emilia-Romagna",
    series: "ironman",
    distanceCategory: "140.6",
    location: "Cervia, Italy",
    country: "IT",
    latitude: 44.4949,
    longitude: 11.3426,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 500,
    runElevationGainM: 100,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 42600, p10FinishSec: 33600, p90FinishSec: 54000 },
    searchTerms: ["emilia romagna", "italy", "cervia", "ironman", "full"],
    active: true,
    typicalMonth: 9,
  },
  {
    name: "IRONMAN St. George",
    series: "ironman",
    distanceCategory: "140.6",
    location: "St. George, Utah, USA",
    country: "US",
    latitude: 37.0965,
    longitude: -113.5684,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 2100,
    runElevationGainM: 600,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 2500, medianFinishSec: 46800, p10FinishSec: 37800, p90FinishSec: 57600 },
    searchTerms: ["st george", "utah", "usa", "ironman", "full", "hilly"],
    active: true,
    typicalMonth: 5,
  },
];

const T100_RACES: Omit<RaceRegistryEntry, "id">[] = [
  {
    name: "T100 Triathlon Singapore",
    series: "t100",
    distanceCategory: "olympic",
    location: "Singapore",
    country: "SG",
    latitude: 1.3521,
    longitude: 103.8198,
    swimDistanceM: 1500,
    bikeDistanceM: 40000,
    runDistanceM: 10000,
    bikeElevationGainM: 100,
    runElevationGainM: 50,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["t100", "pto", "singapore", "pro", "professional"],
    active: true,
    typicalMonth: 3,
  },
  {
    name: "T100 Triathlon San Francisco",
    series: "t100",
    distanceCategory: "olympic",
    location: "San Francisco, California, USA",
    country: "US",
    latitude: 37.7749,
    longitude: -122.4194,
    swimDistanceM: 1500,
    bikeDistanceM: 40000,
    runDistanceM: 10000,
    bikeElevationGainM: 600,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["t100", "pto", "san francisco", "california", "usa", "pro"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "T100 Triathlon Miami",
    series: "t100",
    distanceCategory: "olympic",
    location: "Miami, Florida, USA",
    country: "US",
    latitude: 25.7617,
    longitude: -80.1918,
    swimDistanceM: 1500,
    bikeDistanceM: 40000,
    runDistanceM: 10000,
    bikeElevationGainM: 50,
    runElevationGainM: 20,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["t100", "pto", "miami", "florida", "usa", "pro"],
    active: true,
    typicalMonth: 3,
  },
  {
    name: "T100 Triathlon London",
    series: "t100",
    distanceCategory: "olympic",
    location: "London, UK",
    country: "GB",
    latitude: 51.5074,
    longitude: -0.1278,
    swimDistanceM: 1500,
    bikeDistanceM: 40000,
    runDistanceM: 10000,
    bikeElevationGainM: 200,
    runElevationGainM: 100,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["t100", "pto", "london", "uk", "england", "pro"],
    active: true,
    typicalMonth: 8,
  },
  {
    name: "T100 Triathlon Las Vegas",
    series: "t100",
    distanceCategory: "olympic",
    location: "Las Vegas, Nevada, USA",
    country: "US",
    latitude: 36.1699,
    longitude: -115.1398,
    swimDistanceM: 1500,
    bikeDistanceM: 40000,
    runDistanceM: 10000,
    bikeElevationGainM: 300,
    runElevationGainM: 100,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["t100", "pto", "las vegas", "nevada", "usa", "pro"],
    active: true,
    typicalMonth: 11,
  },
  {
    name: "T100 Triathlon Ibiza",
    series: "t100",
    distanceCategory: "olympic",
    location: "Ibiza, Spain",
    country: "ES",
    latitude: 38.9067,
    longitude: 1.4206,
    swimDistanceM: 1500,
    bikeDistanceM: 40000,
    runDistanceM: 10000,
    bikeElevationGainM: 700,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["t100", "pto", "ibiza", "spain", "pro"],
    active: true,
    typicalMonth: 5,
  },
];

const CHALLENGE_RACES: Omit<RaceRegistryEntry, "id">[] = [
  {
    name: "Challenge Roth",
    series: "challenge",
    distanceCategory: "140.6",
    location: "Roth, Germany",
    country: "DE",
    latitude: 49.2475,
    longitude: 11.0912,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 800,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: { totalAthletes: 5000, medianFinishSec: 41400, p10FinishSec: 32400, p90FinishSec: 52200 },
    searchTerms: ["challenge", "roth", "germany", "full", "fast", "world record"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "Challenge Daytona",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Daytona Beach, Florida, USA",
    country: "US",
    latitude: 29.2108,
    longitude: -81.0228,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 50,
    runElevationGainM: 20,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "daytona", "florida", "usa", "flat", "fast"],
    active: true,
    typicalMonth: 12,
  },
  {
    name: "Challenge Cancun",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Cancun, Mexico",
    country: "MX",
    latitude: 21.1619,
    longitude: -86.8515,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 50,
    runElevationGainM: 20,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "cancun", "mexico", "flat"],
    active: true,
    typicalMonth: 11,
  },
  {
    name: "Challenge Wanaka",
    series: "challenge",
    distanceCategory: "140.6",
    location: "Wanaka, New Zealand",
    country: "NZ",
    latitude: -44.7032,
    longitude: 169.1321,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 1500,
    runElevationGainM: 400,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "wanaka", "new zealand", "scenic"],
    active: true,
    typicalMonth: 2,
  },
  {
    name: "Challenge Almere",
    series: "challenge",
    distanceCategory: "140.6",
    location: "Almere, Netherlands",
    country: "NL",
    latitude: 52.3508,
    longitude: 5.2647,
    swimDistanceM: 3800,
    bikeDistanceM: 180200,
    runDistanceM: 42195,
    bikeElevationGainM: 100,
    runElevationGainM: 30,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "almere", "netherlands", "holland", "flat", "fast"],
    active: true,
    typicalMonth: 9,
  },
  {
    name: "Challenge Samorin",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Samorin, Slovakia",
    country: "SK",
    latitude: 47.9994,
    longitude: 17.3086,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 100,
    runElevationGainM: 30,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "samorin", "slovakia", "the championship"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "Challenge Fuerteventura",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Fuerteventura, Spain",
    country: "ES",
    latitude: 28.3587,
    longitude: -14.0538,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 600,
    runElevationGainM: 150,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "fuerteventura", "spain", "canary islands"],
    active: true,
    typicalMonth: 4,
  },
  {
    name: "Challenge Peguera-Mallorca",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Peguera, Mallorca, Spain",
    country: "ES",
    latitude: 39.5316,
    longitude: 2.4495,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 1200,
    runElevationGainM: 300,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "peguera", "mallorca", "spain", "hilly"],
    active: true,
    typicalMonth: 10,
  },
  {
    name: "Challenge Gran Canaria",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Gran Canaria, Spain",
    country: "ES",
    latitude: 27.9202,
    longitude: -15.5474,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 800,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "gran canaria", "spain", "canary islands"],
    active: true,
    typicalMonth: 4,
  },
  {
    name: "Challenge Rimini",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Rimini, Italy",
    country: "IT",
    latitude: 44.0678,
    longitude: 12.5695,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 200,
    runElevationGainM: 50,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "rimini", "italy"],
    active: true,
    typicalMonth: 5,
  },
  {
    name: "Challenge Sanremo",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Sanremo, Italy",
    country: "IT",
    latitude: 43.8159,
    longitude: 7.7763,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 1000,
    runElevationGainM: 250,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "sanremo", "italy", "hilly"],
    active: true,
    typicalMonth: 9,
  },
  {
    name: "Challenge Walchsee",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Walchsee, Austria",
    country: "AT",
    latitude: 47.6500,
    longitude: 12.3167,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 700,
    runElevationGainM: 200,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "walchsee", "austria", "alps"],
    active: true,
    typicalMonth: 6,
  },
  {
    name: "Challenge Cape Town",
    series: "challenge",
    distanceCategory: "70.3",
    location: "Cape Town, South Africa",
    country: "ZA",
    latitude: -33.9249,
    longitude: 18.4241,
    swimDistanceM: 1900,
    bikeDistanceM: 90000,
    runDistanceM: 21100,
    bikeElevationGainM: 500,
    runElevationGainM: 150,
    gpx: { bikeUrl: null, runUrl: null, source: null },
    stats: null,
    searchTerms: ["challenge", "cape town", "south africa"],
    active: true,
    typicalMonth: 2,
  },
];

// ─── Build Logic ────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildFromCatalog(catalog: CatalogEntry[]): RaceRegistryEntry[] {
  return catalog.map((entry) => {
    const locationKey = entry.metadata.location;
    const geo = GEO_LOOKUP[locationKey];

    // Build search terms from name parts
    const nameParts = entry.event_location
      .replace("IRONMAN 70.3 ", "")
      .toLowerCase()
      .split(/[\s/\-]+/)
      .filter((p) => p.length > 2);

    return {
      id: slugify(entry.event_location),
      name: entry.event_location,
      series: "ironman703" as const,
      distanceCategory: "70.3" as const,
      location: locationKey,
      country: geo?.country || entry.stats.country_iso2 || "XX",
      latitude: geo?.lat || null,
      longitude: geo?.lon || null,
      swimDistanceM: 1900,
      bikeDistanceM: 90000,
      runDistanceM: 21100,
      bikeElevationGainM: null,
      runElevationGainM: null,
      gpx: { bikeUrl: null, runUrl: null, source: null },
      stats: {
        totalAthletes: entry.stats.total_athletes,
        medianFinishSec: entry.stats.finish_time.median_sec,
        p10FinishSec: entry.stats.finish_time.p10_sec,
        p90FinishSec: entry.stats.finish_time.p90_sec,
      },
      searchTerms: [
        "ironman",
        "70.3",
        ...nameParts,
        entry.stats.country_iso2?.toLowerCase() || "",
      ].filter(Boolean),
      active: entry.stats.year_range.last >= 2018,
      typicalMonth: null,
    };
  });
}

function buildManualEntries(
  entries: Omit<RaceRegistryEntry, "id">[],
): RaceRegistryEntry[] {
  return entries.map((entry) => ({
    ...entry,
    id: slugify(entry.name),
  }));
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const catalogPath = join(__dirname, "../src/data/race-catalog.json");
  const outputPath = join(__dirname, "../src/data/race-registry.json");

  console.log("Reading race catalog...");
  const catalog: CatalogEntry[] = JSON.parse(
    readFileSync(catalogPath, "utf-8"),
  );
  console.log(`  Found ${catalog.length} IRONMAN 70.3 races`);

  console.log("Building registry from catalog...");
  const catalogRaces = buildFromCatalog(catalog);

  console.log("Adding IRONMAN 140.6 races...");
  const fullRaces = buildManualEntries(IRONMAN_FULL_RACES);
  console.log(`  Added ${fullRaces.length} races`);

  console.log("Adding T100 races...");
  const t100Races = buildManualEntries(T100_RACES);
  console.log(`  Added ${t100Races.length} races`);

  console.log("Adding Challenge Family races...");
  const challengeRaces = buildManualEntries(CHALLENGE_RACES);
  console.log(`  Added ${challengeRaces.length} races`);

  // Merge and deduplicate
  const allRaces = [...catalogRaces, ...fullRaces, ...t100Races, ...challengeRaces];

  // Check for ID collisions
  const ids = new Set<string>();
  const deduped: RaceRegistryEntry[] = [];
  for (const race of allRaces) {
    if (ids.has(race.id)) {
      console.warn(`  Duplicate ID: ${race.id} — skipping`);
      continue;
    }
    ids.add(race.id);
    deduped.push(race);
  }

  // Sort by popularity (total athletes, descending), then by name
  deduped.sort((a, b) => {
    const aAthletes = a.stats?.totalAthletes || 0;
    const bAthletes = b.stats?.totalAthletes || 0;
    if (bAthletes !== aAthletes) return bAthletes - aAthletes;
    return a.name.localeCompare(b.name);
  });

  console.log(`\nWriting ${deduped.length} races to race-registry.json...`);
  writeFileSync(outputPath, JSON.stringify(deduped, null, 2));

  // Summary
  const seriesCounts = deduped.reduce(
    (acc, r) => {
      acc[r.series] = (acc[r.series] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("\nRegistry summary:");
  for (const [series, count] of Object.entries(seriesCounts)) {
    console.log(`  ${series}: ${count} races`);
  }
  console.log(`  TOTAL: ${deduped.length} races`);
  console.log("\nDone!");
}

main();
