import { fal } from "@fal-ai/client";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

fal.config({
  credentials: process.env.FAL_KEY,
});

const VIDEO_OUTPUT_DIR = "../../video/assets/raw";
const IMAGE_OUTPUT_DIR = "../../video/assets/images";

// Ensure output directories exist
mkdirSync(VIDEO_OUTPUT_DIR, { recursive: true });
mkdirSync(IMAGE_OUTPUT_DIR, { recursive: true });

async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}

// ===== IMAGE GENERATION (nano-banana) =====

interface ImageConfig {
  name: string;
  prompt: string;
}

async function generateImage(config: ImageConfig): Promise<string> {
  console.log(`  Generating image: ${config.name}...`);

  const result = await fal.subscribe("fal-ai/nano-banana-pro", {
    input: {
      prompt: config.prompt,
      num_images: 1,
      aspect_ratio: "9:16",
      resolution: "2K",
      output_format: "png",
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });

  const imageUrl = (result.data as any).images[0].url;
  const imageBuffer = await downloadFile(imageUrl);
  const outputPath = `${IMAGE_OUTPUT_DIR}/${config.name}.png`;
  writeFileSync(outputPath, imageBuffer);
  console.log(` Done -> ${outputPath}`);
  return imageUrl;
}

// ===== VIDEO GENERATION =====

interface TextToVideoConfig {
  name: string;
  prompt: string;
  duration: string;
}

interface MultiPromptConfig {
  name: string;
  shots: Array<{ prompt: string; duration: string }>;
}

interface ImageToVideoConfig {
  name: string;
  imageUrl: string;
  prompt: string;
  duration: string;
}

async function generateTextToVideo(config: TextToVideoConfig): Promise<void> {
  console.log(`  Generating text-to-video: ${config.name} (${config.duration}s)...`);

  const result = await fal.subscribe("fal-ai/kling-video/v3/standard/text-to-video", {
    input: {
      prompt: config.prompt,
      duration: config.duration,
      aspect_ratio: "9:16",
      generate_audio: false,
      negative_prompt: "blur, distort, low quality, text, watermark, logo, cartoon, anime, illustration",
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });

  const videoUrl = (result.data as any).video.url;
  const videoBuffer = await downloadFile(videoUrl);
  const outputPath = `${VIDEO_OUTPUT_DIR}/${config.name}.mp4`;
  writeFileSync(outputPath, videoBuffer);
  console.log(` Done -> ${outputPath}`);
}

async function generateMultiPromptVideo(config: MultiPromptConfig): Promise<void> {
  const totalDuration = config.shots.reduce((sum, s) => sum + parseInt(s.duration), 0);
  console.log(`  Generating multi-prompt video: ${config.name} (${totalDuration}s, ${config.shots.length} shots)...`);

  const result = await fal.subscribe("fal-ai/kling-video/v3/standard/text-to-video", {
    input: {
      multi_prompt: config.shots.map((shot) => ({
        prompt: shot.prompt,
        duration: shot.duration,
      })),
      aspect_ratio: "9:16",
      generate_audio: false,
      negative_prompt: "blur, distort, low quality, text, watermark, logo, cartoon, anime, illustration",
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });

  const videoUrl = (result.data as any).video.url;
  const videoBuffer = await downloadFile(videoUrl);
  const outputPath = `${VIDEO_OUTPUT_DIR}/${config.name}.mp4`;
  writeFileSync(outputPath, videoBuffer);
  console.log(` Done -> ${outputPath}`);
}

async function generateImageToVideo(config: ImageToVideoConfig): Promise<void> {
  console.log(`  Generating image-to-video: ${config.name} (${config.duration}s)...`);

  const result = await fal.subscribe("fal-ai/kling-video/o3/standard/image-to-video", {
    input: {
      image_url: config.imageUrl,
      prompt: config.prompt,
      duration: config.duration,
      aspect_ratio: "9:16",
      generate_audio: false,
      negative_prompt: "blur, distort, low quality, text, watermark, logo, cartoon, anime, illustration",
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });

  const videoUrl = (result.data as any).video.url;
  const videoBuffer = await downloadFile(videoUrl);
  const outputPath = `${VIDEO_OUTPUT_DIR}/${config.name}.mp4`;
  writeFileSync(outputPath, videoBuffer);
  console.log(` Done -> ${outputPath}`);
}

// =============================================================
// V2 "THE PERFECT RACE" — A/B TEST
// =============================================================
// Testing 3 approaches for the same video concept:
//   A) Multi-prompt (single Kling call, 3 shots)
//   B) Individual text-to-video clips (3 separate calls)
//   C) Image-to-video (nano-banana image → Kling animation)

async function generateV2Test() {
  console.log("\n=== V2 'The Perfect Race' — A/B/C Test (Parallel) ===\n");

  const swimPrompt =
    "Cinematic close-up of a triathlete swimmer gliding through calm open water at dawn, powerful freestyle strokes, golden sunlight reflecting off crystal clear water, bubbles and small splashes, serene and controlled, vertical framing, photorealistic, 4K sports photography";
  const bikePrompt =
    "Cinematic low-angle shot of a professional triathlete cyclist in full aero position on a carbon time trial bike riding along an open coastal road, golden hour sun flare, motion blur on spinning wheels, power meter visible on handlebars, determination on face, vertical framing, photorealistic, 4K sports photography";
  const finishPrompt =
    "Cinematic shot of a triathlete runner crossing a race finish line with arms raised in triumph, breaking the finish tape, golden sunset backlighting, crowd cheering along barriers, emotional celebration moment, sweat glistening, vertical framing, photorealistic, 4K sports photography";

  // Step 1: Fire off all independent generations in parallel
  // - Approach A: 1 multi-prompt call
  // - Approach B: 3 individual text-to-video calls
  // - Approach C: 3 image generations (then videos after images complete)

  console.log("Launching all generations in parallel...\n");

  const [multiPromptResult, individualSwim, individualBike, individualFinish, swimImage, bikeImage, finishImage] =
    await Promise.allSettled([
      // A: Multi-prompt
      (async () => {
        console.log("[A] Starting multi-prompt (3 shots in 1 call)...");
        await generateMultiPromptVideo({
          name: "v2-multi-prompt",
          shots: [
            { prompt: swimPrompt, duration: "5" },
            { prompt: bikePrompt, duration: "5" },
            { prompt: finishPrompt, duration: "5" },
          ],
        });
        console.log("[A] Multi-prompt complete.");
      })(),

      // B: Individual clips
      (async () => {
        console.log("[B] Starting individual swim clip...");
        await generateTextToVideo({ name: "v2-individual-swim", prompt: swimPrompt, duration: "5" });
        console.log("[B] Individual swim complete.");
      })(),
      (async () => {
        console.log("[B] Starting individual bike clip...");
        await generateTextToVideo({ name: "v2-individual-bike", prompt: bikePrompt, duration: "5" });
        console.log("[B] Individual bike complete.");
      })(),
      (async () => {
        console.log("[B] Starting individual finish clip...");
        await generateTextToVideo({ name: "v2-individual-run-finish", prompt: finishPrompt, duration: "5" });
        console.log("[B] Individual finish complete.");
      })(),

      // C: Images first (these are fast)
      (async () => {
        console.log("[C] Generating swim image...");
        return await generateImage({
          name: "v2-swim-still",
          prompt:
            "Cinematic vertical photo of a triathlete swimmer in open water at dawn, mid-freestyle stroke, golden sunlight reflecting off calm crystal clear water, bubbles and splashes around arms, serene powerful motion, shot from slightly above water level, photorealistic sports photography, dramatic lighting, 4K quality, no text, no logos",
        });
      })(),
      (async () => {
        console.log("[C] Generating bike image...");
        return await generateImage({
          name: "v2-bike-still",
          prompt:
            "Cinematic vertical photo of a professional triathlete cyclist in aggressive aero position on a carbon time trial bike, riding along a coastal road at golden hour, low dramatic camera angle, motion blur on background, power meter on handlebars showing data, sun flare behind athlete, photorealistic sports photography, 4K quality, no text, no logos",
        });
      })(),
      (async () => {
        console.log("[C] Generating finish image...");
        return await generateImage({
          name: "v2-finish-still",
          prompt:
            "Cinematic vertical photo of a triathlete crossing a race finish line with arms raised in triumph, golden sunset backlighting creating dramatic silhouette, crowd along barriers, finish line banner visible, emotional celebration, sweat glistening in backlight, photorealistic sports photography, 4K quality, no text, no logos",
        });
      })(),
    ]);

  // Step 2: Generate image-to-video clips (need image URLs from step 1)
  const swimImageUrl = swimImage.status === "fulfilled" ? swimImage.value : null;
  const bikeImageUrl = bikeImage.status === "fulfilled" ? bikeImage.value : null;
  const finishImageUrl = finishImage.status === "fulfilled" ? finishImage.value : null;

  if (swimImageUrl || bikeImageUrl || finishImageUrl) {
    console.log("\n[C] Launching image-to-video generations in parallel...");
    const i2vTasks: Promise<void>[] = [];

    if (swimImageUrl) {
      i2vTasks.push(
        generateImageToVideo({
          name: "v2-i2v-swim",
          imageUrl: swimImageUrl,
          prompt:
            "The swimmer continues powerful freestyle strokes through the golden dawn water, ripples and splashes animate naturally, camera slowly pushes in",
          duration: "5",
        })
      );
    }
    if (bikeImageUrl) {
      i2vTasks.push(
        generateImageToVideo({
          name: "v2-i2v-bike",
          imageUrl: bikeImageUrl,
          prompt:
            "The cyclist pedals smoothly in aero position, wheels spinning with motion blur, coastal scenery passes by, golden light shifts slightly",
          duration: "5",
        })
      );
    }
    if (finishImageUrl) {
      i2vTasks.push(
        generateImageToVideo({
          name: "v2-i2v-finish",
          imageUrl: finishImageUrl,
          prompt:
            "The athlete raises arms higher in celebration, crowd cheers and moves, confetti begins to fall, camera slowly zooms in on emotional face",
          duration: "5",
        })
      );
    }

    await Promise.allSettled(i2vTasks);
    console.log("[C] Image-to-video complete.");
  }

  // Report results
  console.log("\n=== V2 Test Complete ===\n");

  const results = [
    { label: "[A] Multi-prompt", result: multiPromptResult },
    { label: "[B] Individual swim", result: individualSwim },
    { label: "[B] Individual bike", result: individualBike },
    { label: "[B] Individual finish", result: individualFinish },
    { label: "[C] Swim image", result: swimImage },
    { label: "[C] Bike image", result: bikeImage },
    { label: "[C] Finish image", result: finishImage },
  ];

  for (const { label, result } of results) {
    const status = result.status === "fulfilled" ? "OK" : `FAILED: ${(result as PromiseRejectedResult).reason}`;
    console.log(`  ${label}: ${status}`);
  }

  console.log("\nGenerated files:");
  console.log("  A) Multi-prompt:  video/assets/raw/v2-multi-prompt.mp4");
  console.log("  B) Individual:    video/assets/raw/v2-individual-{swim,bike,run-finish}.mp4");
  console.log("  C) Image-to-video:");
  console.log("     Images:        video/assets/images/v2-{swim,bike,finish}-still.png");
  console.log("     Videos:        video/assets/raw/v2-i2v-{swim,bike,finish}.mp4");
  console.log("\nReview all outputs and pick the best approach for the remaining 5 videos.");
}

// =============================================================
// QUALITY COMPARISON: Veo 3.1 vs Kling O3 Pro
// =============================================================
// Same prompt, different models. Testing physics quality.

async function generateVeo31(config: { name: string; prompt: string; duration: "4s" | "6s" | "8s" }): Promise<void> {
  console.log(`  Generating Veo 3.1: ${config.name} (${config.duration})...`);

  const result = await fal.subscribe("fal-ai/veo3.1", {
    input: {
      prompt: config.prompt,
      duration: config.duration,
      aspect_ratio: "9:16",
      resolution: "1080p",
      generate_audio: false,
      negative_prompt: "blur, distort, low quality, text, watermark, logo, cartoon, anime",
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });

  const videoUrl = (result.data as any).video.url;
  const videoBuffer = await downloadFile(videoUrl);
  const outputPath = `${VIDEO_OUTPUT_DIR}/${config.name}.mp4`;
  writeFileSync(outputPath, videoBuffer);
  console.log(` Done -> ${outputPath}`);
}

async function generateKlingO3Pro(config: { name: string; prompt: string; duration: string }): Promise<void> {
  console.log(`  Generating Kling O3 Pro: ${config.name} (${config.duration}s)...`);

  const result = await fal.subscribe("fal-ai/kling-video/o3/pro/text-to-video", {
    input: {
      prompt: config.prompt,
      duration: config.duration,
      aspect_ratio: "9:16",
      generate_audio: false,
      negative_prompt: "blur, distort, low quality, text, watermark, logo, cartoon, anime",
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        process.stdout.write(".");
      }
    },
  });

  const videoUrl = (result.data as any).video.url;
  const videoBuffer = await downloadFile(videoUrl);
  const outputPath = `${VIDEO_OUTPUT_DIR}/${config.name}.mp4`;
  writeFileSync(outputPath, videoBuffer);
  console.log(` Done -> ${outputPath}`);
}

async function generateQualityTest() {
  console.log("\n=== Quality Test: Veo 3.1 vs Kling O3 Pro ===\n");

  const testPrompt =
    "Cinematic close-up of a professional triathlete cyclist in full aero position on a carbon time trial bike, riding along an open coastal road at golden hour. Low dramatic camera angle. Motion blur on spinning wheels. Power meter visible on handlebars. Sun flare behind athlete. Sweat glistening on arms. Vertical framing. Photorealistic, cinematic motion, 4K sports photography quality.";

  console.log("Launching both models in parallel...\n");

  const [veoResult, klingResult] = await Promise.allSettled([
    (async () => {
      console.log("[Veo 3.1] Starting...");
      await generateVeo31({
        name: "quality-test-veo31",
        prompt: testPrompt,
        duration: "6s",
      });
      console.log("[Veo 3.1] Complete.");
    })(),
    (async () => {
      console.log("[Kling O3 Pro] Starting...");
      await generateKlingO3Pro({
        name: "quality-test-kling-o3-pro",
        prompt: testPrompt,
        duration: "5",
      });
      console.log("[Kling O3 Pro] Complete.");
    })(),
  ]);

  console.log("\n=== Quality Test Complete ===\n");
  console.log(`  Veo 3.1:       ${veoResult.status === "fulfilled" ? "OK" : `FAILED: ${(veoResult as PromiseRejectedResult).reason}`}`);
  console.log(`  Kling O3 Pro:  ${klingResult.status === "fulfilled" ? "OK" : `FAILED: ${(klingResult as PromiseRejectedResult).reason}`}`);
  console.log("\nFiles:");
  console.log("  video/assets/raw/quality-test-veo31.mp4");
  console.log("  video/assets/raw/quality-test-kling-o3-pro.mp4");
  console.log("\nCompare physics, motion quality, and realism.");
}

// =============================================================
// VEO 3.1 BATCH — Generate key clips for the 6 videos
// =============================================================

async function generateVeoBatch() {
  console.log("\n=== Veo 3.1 Batch — Key Clips (Parallel) ===\n");

  const clips = [
    {
      name: "veo-swim-dawn",
      prompt: "Cinematic close-up of a triathlete swimming freestyle in open water at dawn. Powerful strokes cutting through calm golden water. Underwater-to-surface camera angle capturing bubbles, splashes, and rays of sunlight piercing through the water. Serene yet powerful motion. Vertical 9:16 framing. Photorealistic, cinematic slow motion, professional sports documentary quality.",
    },
    {
      name: "veo-runner-bonk",
      prompt: "Cinematic shot of an exhausted triathlete runner walking during a race, hands on knees, bent over in pain. Other runners pass by in the background. Hot sunny day, sweat dripping, face showing agony and disappointment. Race course with barriers and spectators visible. Vertical 9:16 framing. Photorealistic, dramatic, emotional sports documentary quality.",
    },
    {
      name: "veo-finish-line",
      prompt: "Cinematic shot of a triathlete crossing a race finish line at golden hour. Arms raised high in triumph, breaking through the finish tape. Dramatic backlit silhouette with warm golden sunset light. Crowd cheering behind barriers. Confetti or mist in the air catching light. Emotional celebration moment. Vertical 9:16 framing. Photorealistic, cinematic, award-winning sports photography quality.",
    },
    {
      name: "veo-heat-course",
      prompt: "Cinematic wide shot of a scorching hot triathlon race course. Heat shimmer rising from the asphalt road. Multiple athletes cycling and running in extreme heat, some pouring water over their heads. Harsh midday sun, deep shadows. Temperature feels oppressive. Vertical 9:16 framing. Photorealistic, documentary style, emphasizing the brutal conditions.",
    },
    {
      name: "veo-nutrition-gel",
      prompt: "Cinematic close-up of a triathlete's hands grabbing an energy gel from their bike jersey pocket while riding at speed. The athlete tears it open and consumes it while maintaining cycling form. Bike handlebars and road visible. Focused, methodical nutrition execution. Golden afternoon light. Vertical 9:16 framing. Photorealistic, detailed close-up, sports documentary quality.",
    },
  ];

  console.log(`Launching ${clips.length} Veo 3.1 generations in parallel...\n`);

  const results = await Promise.allSettled(
    clips.map(async (clip) => {
      console.log(`[${clip.name}] Starting...`);
      await generateVeo31({ name: clip.name, prompt: clip.prompt, duration: "6s" });
      console.log(`[${clip.name}] Complete.`);
    })
  );

  console.log("\n=== Veo 3.1 Batch Complete ===\n");
  results.forEach((r, i) => {
    const status = r.status === "fulfilled" ? "OK" : `FAILED: ${(r as PromiseRejectedResult).reason}`;
    console.log(`  ${clips[i].name}: ${status}`);
  });
}

// =============================================================
// VEO 3.1 REMAINING — Generate all remaining clips for 6 videos
// =============================================================

async function generateVeoRemaining() {
  console.log("\n=== Veo 3.1 — Remaining Clips for All 6 Videos (Parallel) ===\n");

  const clips = [
    {
      name: "veo-cyclist-strain",
      prompt:
        "Cinematic close-up of a triathlete cyclist straining hard pedaling uphill on a steep mountain road. Red face, sweat dripping, veins visible on forearms, grimacing expression of pain and effort. Bike wobbling slightly from the effort. Harsh midday sun. Shot from slightly below looking up. Vertical 9:16 framing. Photorealistic, raw emotional sports documentary quality.",
    },
    {
      name: "veo-cyclist-controlled-heat",
      prompt:
        "Cinematic shot of a calm composed triathlete cyclist riding in controlled form on a hot road. Heat shimmer visible on the asphalt ahead. The athlete looks focused and steady while other cyclists in the background appear to be struggling. Sweat on skin but relaxed shoulders. Golden afternoon sun. Vertical 9:16 framing. Photorealistic, professional sports documentary quality.",
    },
    {
      name: "veo-athlete-strong-finish",
      prompt:
        "Cinematic shot of a triathlete running strong and determined at the end of a race while other exhausted athletes walk in the background. The runner has perfect form, upright posture, powerful strides. Late afternoon golden light. Race course with barriers. Clear contrast between the strong runner and the struggling walkers behind. Vertical 9:16 framing. Photorealistic, cinematic sports documentary quality.",
    },
    {
      name: "veo-nervous-transition",
      prompt:
        "Cinematic shot of a nervous first-time triathlete standing in a busy race transition area on race morning. Looking around wide-eyed at all the equipment and other athletes setting up. Fidgeting with their helmet, checking their bike. Early dawn light, misty atmosphere. Vulnerability and excitement on their face. Vertical 9:16 framing. Photorealistic, intimate documentary style.",
    },
    {
      name: "veo-runner-aid-station",
      prompt:
        "Cinematic close-up of a triathlete runner grabbing a cup of water at a race aid station and pouring it over their head while still running. Water splashing dramatically in slow motion. Hot sunny day. Other cups on the table. Race volunteers visible. Refreshing and intense moment. Vertical 9:16 framing. Photorealistic, dynamic sports documentary quality.",
    },
    {
      name: "veo-training-montage",
      prompt:
        "Cinematic shot of a triathlete doing an early morning training swim in a pool at dawn. Lane lines visible, empty pool, steam rising from warm water. Single dedicated athlete doing freestyle laps. Overhead lights reflecting off the water surface. Quiet determination and solitude. First light coming through windows. Vertical 9:16 framing. Photorealistic, atmospheric sports documentary quality.",
    },
  ];

  console.log(`Launching ${clips.length} Veo 3.1 generations in parallel...\n`);

  const results = await Promise.allSettled(
    clips.map(async (clip) => {
      console.log(`[${clip.name}] Starting...`);
      await generateVeo31({ name: clip.name, prompt: clip.prompt, duration: "6s" });
      console.log(`[${clip.name}] Complete.`);
    })
  );

  console.log("\n=== Veo 3.1 Remaining Complete ===\n");
  results.forEach((r, i) => {
    const status = r.status === "fulfilled" ? "OK" : `FAILED: ${(r as PromiseRejectedResult).reason}`;
    console.log(`  ${clips[i].name}: ${status}`);
  });
}

// Main entry point
const command = process.argv[2] || "v2-test";

async function main() {
  console.log("RaceDayAI Video Generation Pipeline");
  console.log(`Command: ${command}\n`);

  switch (command) {
    case "v2-test":
      await generateV2Test();
      break;
    case "quality-test":
      await generateQualityTest();
      break;
    case "veo-batch":
      await generateVeoBatch();
      break;
    case "veo-remaining":
      await generateVeoRemaining();
      break;
    default:
      console.log("Available commands:");
      console.log("  v2-test        — Generate V2 clips with all 3 approaches");
      console.log("  quality-test   — Compare Veo 3.1 vs Kling O3 Pro");
      console.log("  veo-batch      — Generate 5 key clips with Veo 3.1");
      console.log("  veo-remaining  — Generate remaining 6 clips for all videos");
      break;
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
