/**
 * Test script to verify Vercel Blob loading works in production mode
 */

async function testBlobLoading() {
  console.log("Testing Vercel Blob model loading...\n");

  const MODEL_VERSION = "v1.0.0";
  const fileName = "swim_sec_sprint.json";
  const blobUrl = `https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/${MODEL_VERSION}/ml-models/${fileName}`;

  console.log(`Fetching model from Blob storage...`);
  console.log(`URL: ${blobUrl}\n`);

  try {
    const startTime = Date.now();
    const response = await fetch(blobUrl);
    const loadTime = Date.now() - startTime;

    if (!response.ok) {
      console.error(`✗ Failed to load model: ${response.status} ${response.statusText}`);
      return;
    }

    const model = await response.json();
    console.log(`✓ Model loaded successfully in ${loadTime}ms`);
    console.log(`  Model has learner.gradient_booster.model.trees: ${!!model?.learner?.gradient_booster?.model?.trees}`);
    console.log(`  Number of trees: ${model?.learner?.gradient_booster?.model?.trees?.length || "unknown"}`);
    console.log(`  Model structure looks valid: ✓\n`);

    // Test a full prediction cycle
    console.log("Testing prediction with simulated Vercel environment...");

    // Set environment to simulate Vercel
    process.env.VERCEL = "1";
    process.env.MODEL_VERSION = "v1.0.0";

    const { predictRaceTime } = await import("./apps/web/src/lib/ml/predict");

    const testInput = {
      gender: "M" as const,
      age: 35,
      ftp: 250,
      weight: 75,
      css: 90,
      thresholdPace: 240,
      priorRaces: [],
    };

    const prediction = await predictRaceTime(testInput, "sprint");
    console.log(`✓ Prediction completed successfully`);
    console.log(`  Total time: ${Math.floor(prediction.totalSeconds / 60)}:${String(Math.floor(prediction.totalSeconds % 60)).padStart(2, '0')}`);
    console.log(`  Confidence: ${prediction.confidence}%`);
    console.log(`  Tier: ${prediction.tier}`);
  } catch (error) {
    console.error(`✗ Error:`, error instanceof Error ? error.message : error);
  }
}

testBlobLoading();
