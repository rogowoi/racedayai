/**
 * Test script for ML prediction pipeline
 *
 * Run with: npx tsx test-predict.ts
 */

import { predictRaceTime } from "./src/lib/ml/predict";
import type { UserInput } from "./src/lib/ml/types";

async function testPrediction() {
  console.log("Testing ML Prediction Pipeline\n");
  console.log("=".repeat(80));

  // Test Case 1: Tier 3 user (has FTP, weight, age)
  console.log("\n📊 Test Case 1: Tier 3 User (FTP + Weight + Age)");
  const input1: UserInput = {
    gender: "M",
    age: 35,
    ftp: 250,
    weight: 75,
    thresholdPace: 4.5, // min/km
  };

  try {
    const prediction1 = await predictRaceTime(input1, "70.3");
    console.log("\n✓ Prediction successful!");
    console.log(`  Total Time: ${formatSeconds(prediction1.totalSeconds)}`);
    console.log(`  Tier: ${prediction1.tier}, Confidence: ${prediction1.confidence}`);
    console.log("\n  Segments:");
    console.log(`    Swim: ${formatSeconds(prediction1.segments.swim.seconds)} @ ${prediction1.segments.swim.pacePer100m.toFixed(1)}s/100m`);
    console.log(`    Bike: ${formatSeconds(prediction1.segments.bike.seconds)} @ ${prediction1.segments.bike.avgWatts.toFixed(0)}W (NP: ${prediction1.segments.bike.normalizedWatts.toFixed(0)}W)`);
    console.log(`    Run:  ${formatSeconds(prediction1.segments.run.seconds)} @ ${prediction1.segments.run.avgPacePerKm.toFixed(2)} min/km`);
    console.log(`    T1:   ${formatSeconds(prediction1.segments.transitions.t1)}`);
    console.log(`    T2:   ${formatSeconds(prediction1.segments.transitions.t2)}`);
    console.log("\n  Quantiles:");
    console.log(`    5th:  ${formatSeconds(prediction1.quantiles.p05)}`);
    console.log(`    25th: ${formatSeconds(prediction1.quantiles.p25)}`);
    console.log(`    50th: ${formatSeconds(prediction1.quantiles.p50)}`);
    console.log(`    75th: ${formatSeconds(prediction1.quantiles.p75)}`);
    console.log(`    95th: ${formatSeconds(prediction1.quantiles.p95)}`);
  } catch (error) {
    console.error("✗ Prediction failed:", error);
    throw error;
  }

  // Test Case 2: Cold start (Tier 0)
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Test Case 2: Tier 0 User (No Info - Cold Start)");
  const input2: UserInput = {};

  try {
    const prediction2 = await predictRaceTime(input2, "70.3");
    console.log("\n✓ Prediction successful!");
    console.log(`  Total Time: ${formatSeconds(prediction2.totalSeconds)}`);
    console.log(`  Tier: ${prediction2.tier}, Confidence: ${prediction2.confidence}`);
  } catch (error) {
    console.error("✗ Prediction failed:", error);
    throw error;
  }

  // Test Case 3: With prior race (Tier 2)
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Test Case 3: Tier 2 User (Prior Olympic Race)");
  const input3: UserInput = {
    gender: "M",
    age: 35,
    priorRaces: [{ distance: "olympic", time: 9900 }], // 2:45:00
  };

  try {
    const prediction3 = await predictRaceTime(input3, "70.3");
    console.log("\n✓ Prediction successful!");
    console.log(`  Total Time: ${formatSeconds(prediction3.totalSeconds)}`);
    console.log(`  Tier: ${prediction3.tier}, Confidence: ${prediction3.confidence}`);
  } catch (error) {
    console.error("✗ Prediction failed:", error);
    throw error;
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✅ All tests passed!\n");
}

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Run tests
testPrediction().catch((error) => {
  console.error("\n❌ Test suite failed:", error);
  process.exit(1);
});
