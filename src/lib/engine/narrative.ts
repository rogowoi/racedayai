import { xai } from "@/lib/xai";

interface NarrativeInput {
  raceName: string;
  distanceCategory: string;
  raceDate: string;
  weatherTempC: number;
  weatherHumidity: number;
  swimPacePer100m: string;
  bikeTargetPower: number;
  bikeSpeedKph: number;
  runTargetPace: string;
  carbsPerHour: number;
  fluidPerHour: number;
  predictedFinish: string;
  elevationGainM?: number;
  athleteWeight?: number;
}

export async function generateRaceNarrative(
  input: NarrativeInput
): Promise<string | null> {
  if (!xai) return null;

  const prompt = `You are an experienced triathlon coach writing a race-day strategy brief for an athlete.

Race: ${input.raceName} (${input.distanceCategory.toUpperCase()})
Date: ${input.raceDate}
Weather: ${input.weatherTempC}°C, ${input.weatherHumidity}% humidity
${input.elevationGainM ? `Bike Elevation: ${input.elevationGainM}m gain` : ""}

Targets:
- Swim: ${input.swimPacePer100m}/100m
- Bike: ${input.bikeTargetPower}W at ${input.bikeSpeedKph} km/h
- Run: ${input.runTargetPace}/km
- Nutrition: ${input.carbsPerHour}g carbs/hr, ${input.fluidPerHour}ml fluid/hr
- Predicted Finish: ${input.predictedFinish}

Write a 300-500 word race execution strategy narrative. Cover:
1. Pre-race mindset and warmup approach
2. Swim strategy (pacing, sighting, positioning)
3. T1 transition priorities
4. Bike execution (power management, nutrition timing, terrain awareness)
5. T2 transition priorities
6. Run strategy (pacing discipline, nutrition, mental tactics)
7. Final push and finish

Be specific with the numbers provided. Write in second person ("you"). Be motivational but realistic. No headers or bullet points — write flowing prose paragraphs.`;

  try {
    const completion = await xai.chat.completions.create({
      model: "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || null;
  } catch {
    return null;
  }
}
