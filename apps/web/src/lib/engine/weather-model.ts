/**
 * RaceDayAI – Weather Impact Model
 * =====================================
 *
 * Predicts the impact of weather conditions (temperature, wind, humidity) on
 * race performance based on historical analysis and sports science research.
 *
 * Data from:
 *   - weather-impact.json: lookup table of weather condition bins and impact factors
 */

// ── Types ──────────────────────────────────────────────────────

export interface WeatherCondition {
  tempC: number;
  windKph: number;
  humidityPct: number;
}

export interface WeatherImpactBins {
  tempBin: string;
  tempRangeC: string;
  tempImpactPct: number;

  windBin: string;
  windRangeKph: string;
  windImpactPct: number;

  humidityBin: string;
  humidityRangePct: string;
  humidityImpactPct: number;
}

export interface WeatherImpactResult extends WeatherImpactBins {
  combinedImpactPct: number; // total estimated impact
  adjustedTimeSec: number; // predicted time with weather adjustment
  riskLevel: "low" | "moderate" | "high" | "extreme";
}

interface WeatherImpactModel {
  metadata: {
    generated_at: string;
    source: string;
    description?: string;
  };
  model: {
    temperature: Array<{
      bin: string;
      temp_range_c: string;
      impact_pct: number;
      description?: string;
    }>;
    wind: Array<{
      bin: string;
      wind_range_kph: string;
      impact_pct: number;
      description?: string;
    }>;
    humidity: Array<{
      bin: string;
      humidity_range_pct: string;
      impact_pct: number;
      description?: string;
    }>;
  };
}

// ── Defaults & Fallbacks ───────────────────────────────────────

const DEFAULT_IMPACT_MODEL: WeatherImpactModel = {
  metadata: {
    generated_at: new Date().toISOString(),
    source: "hardcoded_defaults",
    description: "Default impact factors when model data unavailable",
  },
  model: {
    temperature: [
      {
        bin: "< 15",
        temp_range_c: "Below 15°C",
        impact_pct: -1.5,
        description: "Cool conditions, slightly faster",
      },
      {
        bin: "15-20",
        temp_range_c: "15-20°C",
        impact_pct: -0.5,
        description: "Cool to mild, slightly faster",
      },
      {
        bin: "20-25",
        temp_range_c: "20-25°C",
        impact_pct: 0.0,
        description: "Mild baseline, neutral",
      },
      {
        bin: "25-30",
        temp_range_c: "25-30°C",
        impact_pct: 2.5,
        description: "Warm, noticeable slowdown from heat",
      },
      {
        bin: "30+",
        temp_range_c: "30°C+",
        impact_pct: 5.0,
        description: "Hot, significant heat penalty",
      },
    ],
    wind: [
      {
        bin: "calm",
        wind_range_kph: "0-15 kph",
        impact_pct: 0.0,
        description: "Calm, neutral baseline",
      },
      {
        bin: "moderate",
        wind_range_kph: "15-30 kph",
        impact_pct: 1.5,
        description: "Moderate wind, slight slowdown",
      },
      {
        bin: "strong",
        wind_range_kph: "30+ kph",
        impact_pct: 3.5,
        description: "Strong wind, significant slowdown",
      },
    ],
    humidity: [
      {
        bin: "dry",
        humidity_range_pct: "0-50%",
        impact_pct: 0.0,
        description: "Dry, neutral baseline",
      },
      {
        bin: "moderate",
        humidity_range_pct: "50-70%",
        impact_pct: 0.5,
        description: "Moderate humidity, minimal impact",
      },
      {
        bin: "humid",
        humidity_range_pct: "70-100%",
        impact_pct: 1.5,
        description: "High humidity, reduced cooling efficiency",
      },
    ],
  },
};

// ── Lazy-loaded model ──────────────────────────────────────────

let impactModel: WeatherImpactModel | null = null;

async function loadImpactModel(): Promise<WeatherImpactModel> {
  if (impactModel !== null) return impactModel;

  try {
    const data = await import("@/data/weather-impact.json");
    const loaded = data.default as WeatherImpactModel;
    if (loaded) {
      impactModel = loaded;
      return loaded;
    }
  } catch {
    // Silently fall through to defaults
  }

  // Fall back to hardcoded defaults
  impactModel = DEFAULT_IMPACT_MODEL;
  return impactModel;
}

// ── Helpers ────────────────────────────────────────────────────

function getTempBinInfo(
  tempC: number,
  model: WeatherImpactModel,
): (typeof model.model.temperature)[0] {
  for (const bin of model.model.temperature) {
    if (bin.bin === "< 15" && tempC < 15) return bin;
    if (bin.bin === "15-20" && tempC >= 15 && tempC < 20) return bin;
    if (bin.bin === "20-25" && tempC >= 20 && tempC < 25) return bin;
    if (bin.bin === "25-30" && tempC >= 25 && tempC < 30) return bin;
    if (bin.bin === "30+" && tempC >= 30) return bin;
  }
  // Fallback to closest
  return model.model.temperature[2]; // 20-25°C baseline
}

function getWindBinInfo(
  windKph: number,
  model: WeatherImpactModel,
): (typeof model.model.wind)[0] {
  for (const bin of model.model.wind) {
    if (bin.bin === "calm" && windKph < 15) return bin;
    if (bin.bin === "moderate" && windKph >= 15 && windKph < 30) return bin;
    if (bin.bin === "strong" && windKph >= 30) return bin;
  }
  return model.model.wind[0]; // calm baseline
}

function getHumidityBinInfo(
  humidityPct: number,
  model: WeatherImpactModel,
): (typeof model.model.humidity)[0] {
  for (const bin of model.model.humidity) {
    if (bin.bin === "dry" && humidityPct < 50) return bin;
    if (bin.bin === "moderate" && humidityPct >= 50 && humidityPct < 70) return bin;
    if (bin.bin === "humid" && humidityPct >= 70) return bin;
  }
  return model.model.humidity[0]; // dry baseline
}

/**
 * Determine risk level based on temperature and humidity (heat stress).
 *
 * Risk increases with:
 * - High temperature (>28°C)
 * - High humidity (>70%)
 * - Combination of both (increased heat stress)
 */
export function getWeatherRiskLevel(
  tempC: number,
  humidityPct: number,
): "low" | "moderate" | "high" | "extreme" {
  // Heat index approximation
  let riskScore = 0;

  // Temperature component
  if (tempC < 15) riskScore -= 1;
  else if (tempC < 20) riskScore += 0;
  else if (tempC < 25) riskScore += 1;
  else if (tempC < 28) riskScore += 2;
  else if (tempC < 32) riskScore += 3;
  else riskScore += 4;

  // Humidity component
  if (humidityPct < 40) riskScore += 0;
  else if (humidityPct < 60) riskScore += 1;
  else if (humidityPct < 75) riskScore += 2;
  else riskScore += 3;

  // Combined risk assessment
  if (riskScore <= 1) return "low";
  if (riskScore <= 3) return "moderate";
  if (riskScore <= 5) return "high";
  return "extreme";
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Predict weather impact on race performance.
 *
 * Inputs:
 *   tempC: Air temperature in Celsius
 *   windKph: Wind speed in kilometers per hour
 *   humidityPct: Relative humidity as percentage (0-100)
 *   basePredictionSec: Predicted finish time without weather adjustments
 *
 * Returns:
 *   Weather impact bins, combined impact %, adjusted time, and risk level.
 */
export async function predictWeatherImpact(params: {
  tempC: number;
  windKph: number;
  humidityPct: number;
  basePredictionSec: number;
}): Promise<WeatherImpactResult> {
  const { tempC, windKph, humidityPct, basePredictionSec } = params;

  const model = await loadImpactModel();

  // Get bins for each condition
  const tempBin = getTempBinInfo(tempC, model);
  const windBin = getWindBinInfo(windKph, model);
  const humidityBin = getHumidityBinInfo(humidityPct, model);

  const tempImpactPct = tempBin?.impact_pct ?? 0;
  const windImpactPct = windBin?.impact_pct ?? 0;
  const humidityImpactPct = humidityBin?.impact_pct ?? 0;

  // Combined impact: assume additive model (conservative)
  // e.g., 2% from heat + 1.5% from wind = 3.5% total slowdown
  const combinedImpactPct = Math.round(
    (tempImpactPct + windImpactPct + humidityImpactPct) * 10,
  ) / 10;

  // Clamp combined impact to reasonable range (-5% to +10%)
  const clampedImpact = Math.max(-5, Math.min(10, combinedImpactPct));

  // Calculate adjusted time
  const adjustedTimeSec = Math.round(
    basePredictionSec * (1 + clampedImpact / 100),
  );

  const riskLevel = getWeatherRiskLevel(tempC, humidityPct);

  return {
    tempBin: tempBin?.bin ?? "unknown",
    tempRangeC: tempBin?.temp_range_c ?? "Unknown",
    tempImpactPct: Math.round(tempImpactPct * 10) / 10,

    windBin: windBin?.bin ?? "unknown",
    windRangeKph: windBin?.wind_range_kph ?? "Unknown",
    windImpactPct: Math.round(windImpactPct * 10) / 10,

    humidityBin: humidityBin?.bin ?? "unknown",
    humidityRangePct: humidityBin?.humidity_range_pct ?? "Unknown",
    humidityImpactPct: Math.round(humidityImpactPct * 10) / 10,

    combinedImpactPct: clampedImpact,
    adjustedTimeSec,
    riskLevel,
  };
}

/**
 * Build weather context for integration into FullStatisticalContext.
 *
 * Formats weather impact data in the expected structure.
 */
export async function buildWeatherContext(params: {
  tempC?: number;
  windKph?: number;
  humidityPct?: number;
  basePredictionSec?: number;
}): Promise<{
  combinedImpactPct: number;
  tempImpactPct: number;
  windImpactPct: number;
  humidityImpactPct: number;
  riskLevel: string;
  adjustedTimeSec: number;
} | null> {
  const { tempC, windKph, humidityPct, basePredictionSec } = params;

  // Return null if missing required parameters
  if (
    tempC === undefined ||
    windKph === undefined ||
    humidityPct === undefined ||
    basePredictionSec === undefined
  ) {
    return null;
  }

  const impact = await predictWeatherImpact({
    tempC,
    windKph,
    humidityPct,
    basePredictionSec,
  });

  return {
    combinedImpactPct: impact.combinedImpactPct,
    tempImpactPct: impact.tempImpactPct,
    windImpactPct: impact.windImpactPct,
    humidityImpactPct: impact.humidityImpactPct,
    riskLevel: impact.riskLevel,
    adjustedTimeSec: impact.adjustedTimeSec,
  };
}
