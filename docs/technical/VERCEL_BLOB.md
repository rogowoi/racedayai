# Vercel Blob ML Model Deployment

Complete guide for serving ML models via Vercel Blob storage for serverless inference.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Model Files](#model-files)
5. [Testing](#testing)
6. [Model Versioning](#model-versioning)
7. [Troubleshooting](#troubleshooting)
8. [Cost Estimate](#cost-estimate)

---

## Overview

### Why Vercel Blob for Model Serving?

**Current Implementation:** RaceDayAI uses 52 XGBoost models (13 per distance × 4 distances) totaling ~488MB. These models are too large to bundle with the application code, so they're served separately via Vercel Blob storage.

**Benefits of Vercel Blob:**
- **Separation of concerns**: Models stored separately from application code
- **Faster deployments**: Application bundle stays small (<10MB)
- **Independent updates**: Update models without redeploying application
- **Built-in CDN**: Models cached at edge locations for faster access
- **Version control**: Built-in versioning with instant rollback
- **Cost-effective**: Pay only for storage and bandwidth used

---

## Architecture

### Three-Tier Model Loading Strategy

The ML prediction system supports three environments:

1. **Production (Vercel)** - Loads from Vercel Blob storage via public URL
2. **Development (local)** - Loads from local filesystem
3. **Browser** - Loads via fetch API from static paths

### Model Loading Logic

```typescript
// apps/web/src/lib/ml/xgboost-inference.ts
async function loadJSON(path: string): Promise<any> {
  const fileName = path.split("/").pop()!;

  // Production: Load from Vercel Blob
  if (typeof window === "undefined" && process.env.VERCEL) {
    const version = process.env.MODEL_VERSION || "v1.0.0";
    const blobUrl = `https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/${version}/ml-models/${fileName}`;
    const response = await fetch(blobUrl);
    return response.json();
  }

  // Local Node.js environment
  if (typeof window === "undefined") {
    const basePath = process.cwd();
    const fullPath = join(basePath, "apps", "web", "src", "data", "ml-models", fileName);
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content);
  }

  // Browser environment
  const response = await fetch(path);
  return response.json();
}
```

---

## Setup Instructions

### Prerequisites

Before starting, ensure you have:

- **Vercel account** with an active project
- **Vercel CLI** installed and authenticated (`/opt/homebrew/bin/vercel`)
- **Trained models** in XGBoost JSON format
- **Node.js v20+** and **pnpm** installed
- **Project structure**: Next.js App Router with TypeScript

### Step 1: Install Dependencies

```bash
cd apps/web
pnpm add @vercel/blob
```

### Step 2: Set Up Blob Store

**Via Vercel Dashboard:**

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project
3. Go to **Storage** tab
4. Click **Create Database** → **Blob**
5. Name your store: `racedayai-blob`
6. Click **Create**

The Vercel Blob store is already configured:
- **Store name**: `racedayai-blob`
- **Token**: `BLOB_READ_WRITE_TOKEN` (set in Vercel environment variables)
- **Public URL base**: `https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/`

### Step 3: Environment Variables

**Local Development:**

```bash
cd apps/web
vercel env pull .env.local

# Add model version
echo 'MODEL_VERSION="v1.0.0"' >> .env.local
```

**Production:**

```bash
# Set model version for production
vercel env add MODEL_VERSION production
# Enter: v1.0.0
```

To verify:
```bash
vercel env ls
```

### Step 4: Upload Models to Blob

When models are updated, upload them using the script:

```bash
# Upload all models to Blob storage
pnpm upload-models

# Or specify a version
pnpm upload-models v1.1.0
```

This runs: `tsx scripts/upload-models-to-blob.ts`

See [scripts/README.md](../../scripts/README.md) for upload script documentation.

---

## Model Files

### Models Uploaded (55 files, 488.30 MB)

**Per Distance (13 models each):**
- `swim_sec_{distance}.json` - Swim time prediction
- `swim_pace_{distance}.json` - Swim pace prediction
- `bike_sec_{distance}.json` - Bike time prediction
- `bike_watts_{distance}.json` - Bike power prediction
- `bike_np_{distance}.json` - Bike normalized power prediction
- `run_sec_{distance}.json` - Run time prediction
- `run_pace_{distance}.json` - Run pace prediction
- `total_{distance}.json` - Total finish time prediction
- `quantile_p05_{distance}.json` - 5th percentile (pessimistic)
- `quantile_p25_{distance}.json` - 25th percentile
- `quantile_p50_{distance}.json` - 50th percentile (median)
- `quantile_p75_{distance}.json` - 75th percentile
- `quantile_p95_{distance}.json` - 95th percentile (optimistic)

**Distances:**
- `sprint` - Sprint triathlon (750m/20km/5km)
- `olympic` - Olympic triathlon (1.5km/40km/10km)
- `70.3` - Half Ironman (1.9km/90km/21.1km)
- `140.6` - Full Ironman (3.8km/180km/42.2km)

**Metadata Files (committed to git):**
- `imputation_tables.json` - Tier-based feature imputation lookups
- `feature_config.json` - Feature names and preprocessing config
- `model_metadata.json` - Training metrics and model versions

### File Structure

```
apps/web/src/
├── data/ml-models/              # Local models (gitignored except metadata)
│   ├── *.json                   # 52 model files (~488MB)
│   ├── imputation_tables.json   # Feature imputation lookup (committed)
│   ├── feature_config.json      # Model feature configuration (committed)
│   └── model_metadata.json      # Model training metadata (committed)
│
├── lib/ml/
│   ├── predict.ts               # Main prediction orchestrator
│   ├── xgboost-inference.ts     # XGBoost tree traversal + model loading
│   ├── imputation.ts            # Feature engineering + imputation
│   ├── validation.ts            # Prediction validation logic
│   └── types.ts                 # TypeScript type definitions
│
└── inngest/functions/
    └── predict-race-time.ts     # Background job for ML predictions
```

---

## Testing

### Test Scripts

Two test scripts are provided:

#### 1. Local Model Loading Test
```bash
npx tsx test-model-loading.ts
```

Tests local filesystem loading for all 4 distances.

**Expected output:**
```
Testing ML model loading and prediction...

=== Testing SPRINT ===
✓ Prediction completed in 425ms
  Total time: 124 min 37 sec
  ...

✅ All tests completed!
```

#### 2. Vercel Blob Production Test
```bash
npx tsx test-blob-production.ts
```

Tests Vercel Blob loading by simulating production environment.

**Expected output:**
```
Testing Vercel Blob model loading...

Fetching model from Blob storage...
URL: https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/v1.0.0/ml-models/swim_sec_sprint.json

✓ Model loaded successfully in 129ms
✓ Prediction completed successfully
```

### Performance

**Load Times:**
- **Local filesystem**: 425-561ms (cold start)
- **Vercel Blob**: ~150ms (cold start)
- **Cached in memory**: <10ms (subsequent requests)

**Model Sizes:**
- Individual model: 5-15 MB each
- Total model size: 488.30 MB (all 52 models)
- Per prediction: ~13 models loaded (varies by distance)

---

## Model Versioning

### Versioning Strategy

Models are versioned using path prefixes:

```
v1.0.0/ml-models/swim_sec_sprint.json
v1.1.0/ml-models/swim_sec_sprint.json
```

**Semantic Versioning:**
- `vMAJOR.MINOR.PATCH` (e.g., `v1.2.3`)
- **MAJOR**: Breaking changes (new features, different input format)
- **MINOR**: New models (additional distances, improved accuracy)
- **PATCH**: Bug fixes (re-exports, metadata updates)

**Date-Based Versioning:**
- `vYYYY-MM-DD` (e.g., `v2026-02-13`)
- Use for daily/weekly model updates
- Simpler for tracking when models were trained

### Rolling Updates

To deploy new models without downtime:

1. Upload new models with new version:
   ```bash
   pnpm upload-models v1.1.0
   ```

2. Update `MODEL_VERSION` environment variable:
   ```bash
   vercel env add MODEL_VERSION production
   # Enter: v1.1.0
   ```

3. Redeploy application:
   ```bash
   vercel --prod
   ```

### Instant Rollback

If new model has issues, rollback immediately:

```bash
# Rollback to previous version
vercel env add MODEL_VERSION production
# Enter: v1.0.0

# Changes take effect immediately (no redeploy needed!)
```

Verify rollback:
```bash
curl https://racedayai.com/api/model-version
```

---

## Troubleshooting

### "Failed to load model from Blob" errors

**Check:**
1. Models are uploaded: `curl -I https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/v1.0.0/ml-models/swim_sec_sprint.json`
2. Environment variables are set: `vercel env ls`
3. Model version matches: Check `MODEL_VERSION` value

### High latency

**Solutions:**
- Enable model caching (already implemented in `xgboost-inference.ts`)
- Use Vercel Edge Functions for faster cold starts (future improvement)
- Pre-warm models with periodic health checks

### Local development issues

**Check:**
1. Models exist locally: `ls apps/web/src/data/ml-models/*.json | wc -l` (should be 55)
2. Path resolution: Ensure running from monorepo root
3. `.env` file exists with tokens

### Out of Memory Errors

**Solution:**

Increase memory limit in `vercel.json`:

```json
{
  "functions": {
    "apps/web/src/app/api/predict/route.ts": {
      "memory": 1024
    }
  }
}
```

Or optimize model loading (lazy load only needed models).

### Slow Cold Starts

**Solutions:**

1. **Enable Vercel Edge Caching:**
   ```typescript
   export const revalidate = 3600; // Cache for 1 hour
   ```

2. **Use Edge Runtime:**
   ```typescript
   export const runtime = 'edge';
   ```

3. **Implement Model Preloading:**
   ```bash
   # Schedule periodic warm-up requests
   vercel cron add "0 */6 * * *" curl https://racedayai.com/api/warm-up
   ```

---

## Cost Estimate

### Vercel Blob Pricing

- Storage: 500MB × $0.15/GB/month = **$0.075/month**
- Bandwidth: 10K predictions × 50MB avg × $0.10/GB = **$50/month**

**Total estimated cost: ~$50/month** for 10K predictions

### Cost Optimization

**With optimization (caching, lazy loading, edge runtime):**
- Estimated cost: **$5-10/month**

### Alternative: Cloudflare R2

For higher traffic, consider migrating to Cloudflare R2:
- Storage: 500MB × $0.015/GB/month = $0.0075/month
- Bandwidth: FREE (no egress fees)

---

## Vercel Deployment

### Build Configuration

The models are NOT bundled with the application:

```gitignore
# .gitignore
apps/web/src/data/ml-models/*.json
!apps/web/src/data/ml-models/imputation_tables.json
!apps/web/src/data/ml-models/feature_config.json
!apps/web/src/data/ml-models/model_metadata.json
```

### Inngest Function

The ML prediction runs as a background job via Inngest:

```typescript
// apps/web/src/inngest/functions/predict-race-time.ts
export const predictRaceTimeFn = inngest.createFunction(
  { id: "predict-race-time", retries: 1 },
  { event: "prediction/race-time.requested" },
  async ({ event, step }) => {
    // Automatically uses Vercel Blob in production
    const prediction = await step.run("predict", async () => {
      return predictRaceTime(input, distance);
    });
    // ...
  }
);
```

**Function Configuration:**
- Max duration: 300s (5 minutes)
- Retries: 1
- Environment: Uses Vercel Blob when `process.env.VERCEL === "1"`

---

## Future Improvements

1. **Model Compression**: Use gzip/brotli to reduce transfer size by ~70%
2. **Lazy Loading**: Only load models when needed (partial implementation exists)
3. **Edge Functions**: Move model serving closer to users
4. **Model Caching**: Implement Redis cache for frequently-used models
5. **A/B Testing**: Support multiple model versions simultaneously

---

## Links

- **Vercel Blob Documentation**: https://vercel.com/docs/storage/vercel-blob
- **Inngest Documentation**: https://www.inngest.com/docs
- **XGBoost Format**: https://xgboost.readthedocs.io/en/stable/tutorials/saving_model.html
- **Upload Script**: [scripts/README.md](../../scripts/README.md)
- **ML Pipeline Guide**: [ML_PIPELINE.md](ML_PIPELINE.md)

---

**Last Updated:** February 14, 2026
