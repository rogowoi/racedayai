export type WeatherData = {
  tempC: number;
  humidity: number;
  windSpeedKph: number;
  windDir: number;
  precipitationProb: number;
  weatherCode: number;
  dewPoint?: number;
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
    // Too far for accurate forecast. Return seasonal average mock or historical.
    // For now, mock a "typical" day.
    console.warn("Date too far for forecast. Using mock data.");
    return {
      tempC: 22,
      humidity: 60,
      windSpeedKph: 15,
      windDir: 90,
      precipitationProb: 0,
      weatherCode: 1,
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
    };
  } catch (e) {
    console.error("Weather error:", e);
    // Fallback
    return {
      tempC: 20,
      humidity: 50,
      windSpeedKph: 10,
      windDir: 0,
      precipitationProb: 0,
      weatherCode: 0,
    };
  }
}
