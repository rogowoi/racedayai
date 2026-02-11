import { fal } from "@fal-ai/client";
import { writeFileSync, mkdirSync } from "fs";
import sharp from "sharp";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Configure FAL
fal.config({
  credentials: process.env.FAL_KEY,
});

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}

async function generateBranding() {
  console.log("🎨 Starting RaceDayAI branding generation with Nano Banana Pro...\n");

  // Ensure public directory exists
  mkdirSync("public/branding-variations", { recursive: true });

  // ===== OG IMAGES (1200x630) =====
  console.log("📱 Generating OG Image variations...\n");

  const ogPrompts = [
    {
      name: "og-tech-forward",
      prompt: "Professional marketing hero image for RaceDayAI, an AI-powered triathlon platform. Determined triathlete cyclist on aerodynamic race bike, shot from side angle in motion. Subtle holographic data overlays showing metrics: 195W power, 5:12:43 time, pace zones. Modern tech aesthetic with athletic energy. Clean gradient background (deep blue to cyan). High-tech meets endurance sports. Professional sports photography, dynamic lighting, shallow depth of field, 8K quality, cinematic composition, marketing ready.",
    },
    {
      name: "og-minimal-modern",
      prompt: "Abstract modern branding image for RaceDayAI triathlon app. Geometric composition with flowing motion lines suggesting speed and forward movement. Gradient from electric blue to vibrant cyan. Incorporate subtle data visualization elements (line graphs, power curves) blended into design. Clean negative space, professional tech startup aesthetic, minimalist, sophisticated. Perfect for social media sharing. High contrast, 8K quality, award-winning graphic design.",
    },
    {
      name: "og-split-functional",
      prompt: "Split-screen marketing banner for RaceDayAI. Left side: silhouette of powerful triathlete in motion (cyclist). Right side: sleek data dashboard showing race metrics, pacing zones, weather data (31°C), nutrition timeline. Professional tech product photography meets athletic performance. Modern UI elements, holographic effects, gradient background. Clean separation, balanced composition. Marketing ready, high quality, professional branding.",
    },
    {
      name: "og-aspirational",
      prompt: "Inspirational hero image for RaceDayAI triathlon platform. Close-up of determined athlete's face/upper body with focus and intensity. Subtle AI circuit patterns and data overlays in background (not overwhelming). Golden hour lighting, bokeh effect. Text space at top or bottom. Aspirational, motivational, premium feel. Professional athlete photography, cinematic lighting, 8K quality, emotional connection, race day energy.",
    },
  ];

  for (const { name, prompt } of ogPrompts) {
    console.log(`  Generating ${name}...`);
    try {
      const result = await fal.subscribe("fal-ai/nano-banana-pro", {
        input: {
          prompt,
          num_images: 1,
          aspect_ratio: "16:9",
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

      const imageBuffer = await downloadImage(result.data.images[0].url);
      const resized = await sharp(imageBuffer)
        .resize(1200, 630, { fit: "cover" })
        .png()
        .toBuffer();

      writeFileSync(`public/branding-variations/${name}.png`, resized);
      console.log(` ✓ Saved as ${name}.png`);
    } catch (error: any) {
      console.error(` ✗ Failed: ${error.message}`);
    }
  }

  // ===== LOGO/ICON IMAGES (square) =====
  console.log("\n🎯 Generating Logo/Icon variations...\n");

  const iconPrompts = [
    {
      name: "icon-letter-r",
      prompt: "Modern minimalist app icon logo. Bold stylized letter 'R' incorporating a lightning bolt element and forward motion arrow. Vibrant gradient from electric blue to cyan. Geometric, clean shapes with negative space. High contrast on dark background. Perfect for small sizes (32px-180px). Flat design, tech startup aesthetic, memorable, professional. Icon design, vector quality.",
    },
    {
      name: "icon-triathlon-circuit",
      prompt: "Minimal modern app icon for RaceDayAI. Abstract symbol combining swim/bike/run elements (simplified silhouettes) with AI circuit pattern integrated subtly. Single vibrant color (electric blue or cyan) on dark navy background. Bold geometric design, recognizable at small sizes. Tech meets athletics. Clean, professional, memorable brand mark. Icon design, flat modern style, high contrast.",
    },
    {
      name: "icon-forward-motion",
      prompt: "Dynamic app icon logo for race execution platform. Forward-pointing arrow combined with speed lines suggesting movement and progress. Lightning bolt accent for AI/power element. Bold geometric shapes, vibrant cyan-blue gradient. Modern tech aesthetic, energetic, motivational. Perfect at small and large sizes. Icon design, flat style, high contrast, professional branding.",
    },
  ];

  for (const { name, prompt } of iconPrompts) {
    console.log(`  Generating ${name}...`);
    try {
      const result = await fal.subscribe("fal-ai/nano-banana-pro", {
        input: {
          prompt,
          num_images: 1,
          aspect_ratio: "1:1",
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

      const imageBuffer = await downloadImage(result.data.images[0].url);

      // Save high-res version
      writeFileSync(`public/branding-variations/${name}.png`, imageBuffer);

      // Generate favicon (32x32)
      const favicon = await sharp(imageBuffer)
        .resize(32, 32, { fit: "cover" })
        .png()
        .toBuffer();
      writeFileSync(`public/branding-variations/${name}-32x32.png`, favicon);

      // Generate apple touch icon (180x180)
      const appleIcon = await sharp(imageBuffer)
        .resize(180, 180, { fit: "cover" })
        .png()
        .toBuffer();
      writeFileSync(`public/branding-variations/${name}-180x180.png`, appleIcon);

      console.log(` ✓ Saved ${name} (all sizes)`);
    } catch (error: any) {
      console.error(` ✗ Failed: ${error.message}`);
    }
  }

  console.log("\n✨ Branding generation complete!");
  console.log("\n📁 Review all variations in: public/branding-variations/");
  console.log("\n📋 Next steps:");
  console.log("  1. Review all generated images");
  console.log("  2. Select your favorites");
  console.log("  3. Copy selected images to:");
  console.log("     - public/og-image.png (chosen OG image)");
  console.log("     - public/favicon.ico (chosen icon 32x32)");
  console.log("     - public/apple-touch-icon.png (chosen icon 180x180)");
}

// Run the generator
generateBranding().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
