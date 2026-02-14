export type WeatherData = {
  tempC: number;
  humidity: number;
  windSpeedKph: number;
  windDir: number;
  precipitationProb: number;
  weatherCode: number;
  dewPoint?: number;
  isEstimated?: boolean; // Kept for backward compatibility
  source: "forecast" | "historical_estimate" | "unavailable";
  sourceReason?: string;
};

// Open-Meteo API
// https://open-meteo.com/en/docs
export async function getRaceWeather(
  lat: number,
  lon: number,
  date: Date,
): Promise<WeatherData> {
  const isoDate = date.toISOString().split("T")[0];

  // Check if date is in future beyond forecast range (14-16 days)
  // If so, fetch historical data for that day from previous year?
  // For MVP, if date is too far, return average defaults.
  // Actually, Open-Meteo has a climate API for long range.
  // Let's stick to forecast for near term, or fail gracefully.

  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays > 10) {
    // Too far for accurate forecast. Use historical data from previous year(s)
    console.info("[weather] source=historical_estimate reason=out_of_forecast_range");

    try {
      // Get historical data from the same date in previous years (up to 2 years back)
      const lastYear = new Date(date);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      const lastYearIso = lastYear.toISOString().split("T")[0];

      const twoYearsAgo = new Date(date);
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const twoYearsAgoIso = twoYearsAgo.toISOString().split("T")[0];

      const historicalUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${twoYearsAgoIso}&end_date=${lastYearIso}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

      const res = await fetch(historicalUrl);
      if (!res.ok) throw new Error("Historical weather fetch failed");
      const data = await res.json();

      // Average the data from the same month/day across available years
      const hourly = data.hourly;
      const daily = data.daily;

      if (hourly?.temperature_2m?.length > 0) {
        // Find noon data points (around index 12 of each day)
        const noonTemps: number[] = [];
        const noonHumidity: number[] = [];
        const noonWindSpeed: number[] = [];

        for (let i = 12; i < hourly.temperature_2m.length; i += 24) {
          if (hourly.temperature_2m[i]) noonTemps.push(hourly.temperature_2m[i]);
          if (hourly.relative_humidity_2m[i]) noonHumidity.push(hourly.relative_humidity_2m[i]);
          if (hourly.wind_speed_10m[i]) noonWindSpeed.push(hourly.wind_speed_10m[i]);
        }

        const avgTemp = noonTemps.reduce((a, b) => a + b, 0) / noonTemps.length;
        const avgHumidity = noonHumidity.reduce((a, b) => a + b, 0) / noonHumidity.length;
        const avgWindSpeed = noonWindSpeed.reduce((a, b) => a + b, 0) / noonWindSpeed.length;

        return {
          tempC: Math.round(avgTemp),
          humidity: Math.round(avgHumidity),
          windSpeedKph: Math.round(avgWindSpeed),
          windDir: 0,
          precipitationProb: 0,
          weatherCode: 1,
          isEstimated: true,
          source: "historical_estimate",
          sourceReason: "out_of_forecast_range",
        };
      }
    } catch (e) {
      console.error("[weather] source=unavailable reason=historical_fetch_failed", e);
    }

    // Final fallback if historical data fails.
    // We keep neutral values for engine calculations, but UI can hide these
    // because source is explicitly unavailable.
    return {
      tempC: 20,
      humidity: 50,
      windSpeedKph: 10,
      windDir: 0,
      precipitationProb: 0,
      weatherCode: 0,
      isEstimated: false,
      source: "unavailable",
      sourceReason: "historical_fetch_failed",
    };
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m&start_date=${isoDate}&end_date=${isoDate}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();

    // Pick noon data for simplicity for now
    const hourly = data.hourly;
    const noonIndex = 12; // 12:00

    return {
      tempC: hourly.temperature_2m[noonIndex],
      humidity: hourly.relative_humidity_2m[noonIndex],
      windSpeedKph: hourly.wind_speed_10m[noonIndex],
      windDir: 0, // Not always available in basic hourly
      precipitationProb: data.daily.precipitation_probability_max[0],
      weatherCode: data.daily.weather_code[0],
      dewPoint: hourly.dew_point_2m[noonIndex],
      isEstimated: false,
      source: "forecast",
      sourceReason: "forecast_api",
    };
  } catch (e) {
    console.error("[weather] source=unavailable reason=forecast_fetch_failed", e);
    // Keep neutral values for engine calculations; UI can show unavailable state.
    return {
      tempC: 20,
      humidity: 50,
      windSpeedKph: 10,
      windDir: 0,
      precipitationProb: 0,
      weatherCode: 0,
      isEstimated: false,
      source: "unavailable",
      sourceReason: "forecast_fetch_failed",
    };
  }
}
