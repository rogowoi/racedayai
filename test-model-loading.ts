/**
 * Test script to verify ML model loading works locally
 */

import { predictRaceTime } from "./apps/web/src/lib/ml/predict";
import type { UserInput, Distance } from "./apps/web/src/lib/ml/types";

async function testModelLoading() {
  console.log("Testing ML model loading and prediction...\n");

  // Test input (simulated athlete profile)
  const input: UserInput = {
    gender: "M",
    age: 35,
    ftp: 250,
    weight: 75,
    css: 90, // 1:30/100m
    thresholdPace: 240, // 4:00/km
    priorRaces: [],
  };

  const distances: Distance[] = ["sprint", "olympic", "70.3", "140.6"];

  for (const distance of distances) {
    try {
      console.log(`\n=== Testing ${distance.toUpperCase()} ===`);

      const startTime = Date.now();
      const prediction = await predictRaceTime(input, distance);
      const loadTime = Date.now() - startTime;

      console.log(`✓ Prediction completed in ${loadTime}ms`);
      console.log(`  Total time: ${Math.floor(prediction.totalSeconds / 60)} min ${Math.floor(prediction.totalSeconds % 60)} sec`);
      console.log(`  Swim: ${Math.floor(prediction.segments.swim.seconds / 60)}:${String(Math.floor(prediction.segments.swim.seconds % 60)).padStart(2, '0')}`);
      console.log(`  Bike: ${Math.floor(prediction.segments.bike.seconds / 60)}:${String(Math.floor(prediction.segments.bike.seconds % 60)).padStart(2, '0')} (${Math.round(prediction.segments.bike.avgWatts)}W)`);
      console.log(`  Run: ${Math.floor(prediction.segments.run.seconds / 60)}:${String(Math.floor(prediction.segments.run.seconds % 60)).padStart(2, '0')}`);
      console.log(`  Confidence: ${prediction.confidence}%`);
      console.log(`  Tier: ${prediction.tier}`);
    } catch (error) {
      console.error(`✗ Error testing ${distance}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n✅ All tests completed!");
}

testModelLoading().catch(console.error);
