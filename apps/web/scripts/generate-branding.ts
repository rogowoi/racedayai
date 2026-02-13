import { fal } from "@fal-ai/client";
import { writeFileSync, mkdirSync, copyFileSync } from "fs";
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
  console.log(
    "🎨 Starting RaceDayAI branding generation (Performance Brand v2)...\n"
  );
  console.log("   Brand palette: Hot Orange + Deep Black + Electric Blue\n");

  // Ensure output directory exists
  mkdirSync("public/branding-v2", { recursive: true });

  // ===== OG IMAGES (1200x630) =====
  console.log("📱 Generating OG Image variations...\n");

  const ogPrompts = [
    {
      name: "og-performance-hero",
      prompt:
        "Cinematic marketing hero image for RaceDayAI performance platform. Powerful triathlete cyclist in aggressive aero position on carbon race bike, racing at high speed. Shot from dramatic low angle. Deep black background fading to warm orange/amber glow behind athlete. Subtle holographic data overlays in orange and white: 195W, 5:12:43, HR 162. Motion blur on wheels, sharp focus on athlete. Professional sports photography, dramatic lighting, high contrast, dark moody atmosphere with orange accent light. 8K quality, award-winning sports photo.",
    },
    {
      name: "og-data-dashboard",
      prompt:
        "Sleek product screenshot style marketing image for RaceDayAI. Dark interface showing race execution dashboard: pacing chart with orange line graph over elevation profile, nutrition timeline with orange markers, weather widget showing 31°C warning in amber. Clean dark UI design (black/charcoal) with orange (#EA580C) accent color and white text. Professional tech product photography, slight perspective tilt, subtle glow effects on screen. Modern data visualization aesthetic. 8K quality, product marketing hero shot.",
    },
    {
      name: "og-finish-line",
      prompt:
        "Powerful emotional marketing image for RaceDayAI. Triathlete crossing finish line with arms raised in triumph, finish line tape breaking. Dramatic backlighting with warm orange/golden sunset. Motion and energy captured. Dark vignette edges. Atmosphere of achievement and precision. Professional sports photography, cinematic composition, emotional power, golden hour lighting with orange color grading. 8K quality, inspirational hero shot.",
    },
    {
      name: "og-abstract-speed",
      prompt:
        "Abstract premium branding image for RaceDayAI. Dynamic flowing lines and geometric shapes suggesting speed, data, and forward momentum. Color palette: deep black background, vibrant orange (#EA580C) primary streaks, electric blue (#0EA5E9) accent data points. Subtle grid pattern suggesting precision and calculation. Modern tech aesthetic meets athletic energy. Clean negative space, sophisticated, minimal. Award-winning graphic design, 8K quality.",
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

      writeFileSync(`public/branding-v2/${name}.png`, resized);
      console.log(` ✓ Saved as ${name}.png (1200x630)`);
    } catch (error: any) {
      console.error(` ✗ Failed: ${error.message}`);
    }
  }

  // ===== LOGO/ICON IMAGES (square) =====
  console.log("\n🎯 Generating Logo/Icon variations...\n");

  const iconPrompts = [
    {
      name: "icon-bolt-mark",
      prompt:
        "Minimal modern app icon. Bold geometric lightning bolt symbol on dark black circle background. Lightning bolt in vibrant orange gradient (#EA580C to #F97316). Clean sharp edges, perfectly symmetrical. Flat design, no text, no gradients on background. High contrast, recognizable at 32px. Professional brand mark, tech startup aesthetic. Icon design, vector quality, centered composition.",
    },
    {
      name: "icon-r-performance",
      prompt:
        "Sleek app icon logo. Stylized bold letter 'R' with integrated forward arrow or speed element. Orange (#EA580C) on dark charcoal/black circle background. Geometric, modern, clean negative space. Slight orange glow effect. High contrast, readable at small sizes (32px-180px). Professional tech brand mark. Flat modern design, centered, icon quality.",
    },
    {
      name: "icon-pulse-arrow",
      prompt:
        "Dynamic app icon for race execution platform. Forward-pointing chevron or arrow combined with heartbeat/pulse line. Vibrant orange (#EA580C) on deep black circular background. Bold geometric shapes suggesting speed and data. Energetic, modern, minimal. Perfect at both small and large sizes. Professional icon design, flat style, high contrast, centered.",
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
      writeFileSync(`public/branding-v2/${name}.png`, imageBuffer);

      // Generate apple touch icon (180x180)
      const appleIcon = await sharp(imageBuffer)
        .resize(180, 180, { fit: "cover" })
        .png()
        .toBuffer();
      writeFileSync(`public/branding-v2/${name}-180x180.png`, appleIcon);

      // Generate favicon (32x32)
      const favicon = await sharp(imageBuffer)
        .resize(32, 32, { fit: "cover" })
        .png()
        .toBuffer();
      writeFileSync(`public/branding-v2/${name}-32x32.png`, favicon);

      console.log(` ✓ Saved ${name} (high-res, 180x180, 32x32)`);
    } catch (error: any) {
      console.error(` ✗ Failed: ${error.message}`);
    }
  }

  // ===== AUTO-SELECT BEST & DEPLOY =====
  console.log("\n🚀 Deploying recommended defaults...\n");

  // Copy recommended OG image to public root
  try {
    copyFileSync(
      "public/branding-v2/og-performance-hero.png",
      "public/og-image.png"
    );
    console.log("  ✓ og-image.png ← og-performance-hero.png");
  } catch {
    console.log("  ⚠ Could not auto-deploy OG image (review manually)");
  }

  // Copy recommended icon to public root
  try {
    copyFileSync(
      "public/branding-v2/icon-bolt-mark-180x180.png",
      "public/apple-touch-icon.png"
    );
    console.log("  ✓ apple-touch-icon.png ← icon-bolt-mark-180x180.png");
  } catch {
    console.log("  ⚠ Could not auto-deploy apple touch icon (review manually)");
  }

  console.log("\n✨ Branding v2 generation complete!");
  console.log("\n📁 All variations in: public/branding-v2/");
  console.log("\n📋 What was generated:");
  console.log("  OG Images (1200x630):");
  console.log("    • og-performance-hero.png — Cyclist with orange data overlays");
  console.log("    • og-data-dashboard.png — Dark UI dashboard product shot");
  console.log("    • og-finish-line.png — Triumph at the finish line");
  console.log("    • og-abstract-speed.png — Abstract orange/blue speed lines");
  console.log("  Icons (high-res + 180x180 + 32x32):");
  console.log("    • icon-bolt-mark — Orange lightning on dark");
  console.log("    • icon-r-performance — Stylized R with speed element");
  console.log("    • icon-pulse-arrow — Arrow + pulse line");
  console.log("\n  Defaults auto-deployed to public/ root.");
  console.log("  Review and swap in your favorites!");
}

// Run the generator
generateBranding().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
