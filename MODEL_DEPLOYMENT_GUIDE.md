# ML Model Deployment Guide

## Overview

The ML models are ~500MB total (40 models × 4 distances) and should NOT be committed to git. Instead, they're deployed separately to Vercel using one of these strategies:

---

## Strategy 1: Vercel Blob Storage (Recommended)

Upload models to Vercel Blob and load them at runtime.

### Setup

```bash
# 1. Install Vercel Blob SDK
pnpm add @vercel/blob

# 2. Upload models to Vercel Blob
node scripts/upload-models-to-blob.js
```

### Create upload script

```typescript
// scripts/upload-models-to-blob.ts
import { put } from '@vercel/blob';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const MODELS_DIR = 'apps/web/src/data/ml-models';

async function uploadModels() {
  const files = await readdir(MODELS_DIR);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = join(MODELS_DIR, file);
    const content = await readFile(filePath);

    const blob = await put(`ml-models/${file}`, content, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log(`✓ Uploaded: ${file} -> ${blob.url}`);
  }
}

uploadModels();
```

### Update model loading

```typescript
// apps/web/src/lib/ml/xgboost-inference.ts
async function loadJSON(path: string): Promise<any> {
  // Browser/Edge environment - load from Vercel Blob
  if (typeof window === "undefined" && process.env.VERCEL) {
    const fileName = path.split("/").pop()!;
    const blobUrl = `${process.env.BLOB_READ_WRITE_TOKEN}/ml-models/${fileName}`;
    const response = await fetch(blobUrl);
    return response.json();
  }

  // Local Node.js environment
  if (typeof window === "undefined") {
    const basePath = process.cwd();
    const fileName = path.split("/").pop()!;
    const fullPath = join(basePath, "src", "data", "ml-models", fileName);
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content);
  }

  // Browser environment
  const response = await fetch(path);
  return response.json();
}
```

### Pros/Cons

✅ **Pros:**
- Simple to implement
- No build-time overhead
- Models loaded on-demand
- Easy to update models independently

❌ **Cons:**
- Cold start latency (~200ms per model load)
- Additional Blob storage costs
- Network dependency

---

## Strategy 2: Build-Time Bundling (Alternative)

Include models in the Next.js build output.

### Setup

```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'asset/resource',
      include: [path.resolve(__dirname, 'src/data/ml-models')],
    });
    return config;
  },
};
```

### Update model loading

```typescript
// apps/web/src/lib/ml/xgboost-inference.ts
async function loadJSON(path: string): Promise<any> {
  // Production - load from build output
  if (process.env.NODE_ENV === 'production') {
    const fileName = path.split("/").pop()!;
    const model = await import(`@/data/ml-models/${fileName}`);
    return model.default;
  }

  // Development - load from filesystem
  const basePath = process.cwd();
  const fileName = path.split("/").pop()!;
  const fullPath = join(basePath, "src", "data", "ml-models", fileName);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content);
}
```

### Pros/Cons

✅ **Pros:**
- No cold start latency
- No network dependency
- No additional costs

❌ **Cons:**
- Longer build times (~2-3 min)
- Larger deployment size (500MB+)
- Models bundled with code (harder to update independently)
- May exceed Vercel's 250MB serverless function limit

---

## Strategy 3: Cloudflare R2 (Best for Large-Scale)

Upload models to R2 and serve via CDN.

### Setup

```bash
# 1. Upload models to R2
aws s3 sync apps/web/src/data/ml-models/ \
  s3://racedayai-models/ \
  --endpoint-url=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
  --region=auto

# 2. Make bucket public via Cloudflare dashboard
# 3. Add R2 public URL to environment variables
```

### Update model loading

```typescript
// apps/web/src/lib/ml-models/xgboost-inference.ts
const MODEL_CDN_URL = process.env.NEXT_PUBLIC_MODEL_CDN_URL || 'https://models.racedayai.com';

async function loadJSON(path: string): Promise<any> {
  const fileName = path.split("/").pop()!;

  // Production - load from R2 CDN
  if (process.env.NODE_ENV === 'production') {
    const response = await fetch(`${MODEL_CDN_URL}/ml-models/${fileName}`);
    return response.json();
  }

  // Development - load from filesystem
  const basePath = process.cwd();
  const fullPath = join(basePath, "src", "data", "ml-models", fileName);
  const content = await readFile(fullPath, "utf-8");
  return JSON.parse(content);
}
```

### Pros/Cons

✅ **Pros:**
- Fast CDN delivery
- Lowest cost ($0.015/GB)
- No serverless function size limits
- Easy to version and rollback

❌ **Cons:**
- Requires R2 setup
- Network dependency
- Need to manage uploads

---

## Recommended Approach

**For RaceDayAI, use Strategy 1 (Vercel Blob):**

1. **Simplicity** - Easy to set up and maintain
2. **Cost** - Blob storage is cheap for 500MB
3. **Flexibility** - Models can be updated independently
4. **Performance** - Acceptable cold start (~200ms)

### Implementation Steps

```bash
# 1. Upload models to Vercel Blob
pnpm tsx scripts/upload-models-to-blob.ts

# 2. Update environment variables
vercel env add BLOB_READ_WRITE_TOKEN

# 3. Deploy
vercel --prod
```

---

## Model Caching Strategy

To minimize cold start latency, implement caching:

```typescript
// apps/web/src/lib/ml/xgboost-inference.ts
const modelCache = new Map<string, XGBoostModel>();

export async function loadModel(modelPath: string): Promise<XGBoostModel> {
  // Check cache first
  if (modelCache.has(modelPath)) {
    return modelCache.get(modelPath)!;
  }

  // Load and cache
  const model = await loadJSON(modelPath);
  modelCache.set(modelPath, model);
  return model;
}
```

---

## Model Versioning

Keep track of model versions in metadata:

```json
// apps/web/src/data/ml-models/model_metadata.json
{
  "version": "1.0.0",
  "trained_at": "2026-02-13T22:39:07Z",
  "distances": ["sprint", "olympic", "70.3", "140.6"],
  "metrics": {
    "70.3": {
      "mae_minutes": 15.04,
      "r2": 0.8095
    }
  }
}
```

---

## Retraining Pipeline

Set up periodic retraining with Inngest:

```typescript
// apps/web/src/inngest/functions/retrain-models.ts
export const retrainModels = inngest.createFunction(
  { id: "retrain-models" },
  { cron: "0 0 * * 0" }, // Weekly on Sunday
  async ({ step }) => {
    // 1. Fetch latest race data
    // 2. Run ETL
    // 3. Train models
    // 4. Upload to Blob
    // 5. Update metadata
  }
);
```

---

## Monitoring

Track model performance in production:

```typescript
// Log predictions for monitoring
await db.prediction.create({
  data: {
    userId,
    distance,
    input: userInput,
    prediction: result,
    modelVersion: metadata.version,
    tier,
  },
});
```

---

## Local Development

For local development, models are loaded from filesystem:

```bash
# 1. Train models locally
python3 -m research.scripts.train_models --distances sprint,olympic,70.3,140.6

# 2. Export to web app
python3 -m research.scripts.export_artifacts \
  --input-dir research/artifacts/models/ \
  --output-dir apps/web/src/data/ml-models/ \
  --distances sprint,olympic,70.3,140.6

# 3. Run Next.js dev server
pnpm dev
```

Models are automatically gitignored, so they won't be committed.

---

## Production Deployment Checklist

- [ ] Train models for all 4 distances
- [ ] Export models to TypeScript format
- [ ] Upload models to Vercel Blob (or R2)
- [ ] Update environment variables
- [ ] Test Inngest function locally
- [ ] Deploy to production
- [ ] Verify predictions work end-to-end
- [ ] Set up monitoring dashboard

---

## Troubleshooting

### "Failed to load model" errors

Check that:
1. Models are uploaded to Blob/R2
2. Environment variables are set correctly
3. Model file names match expected format

### High latency

Enable model caching or switch to R2 CDN.

### Memory errors

Models are large (~10MB each). Use streaming or lazy loading:

```typescript
// Load models on-demand instead of preloading all
const model = await loadModel(`swim_sec_${distance}.json`);
```

---

## Cost Estimate

**Vercel Blob:**
- Storage: 500MB × $0.15/GB = $0.075/month
- Bandwidth: 10K predictions/month × 50MB avg × $0.10/GB = $50/month

**Cloudflare R2:**
- Storage: 500MB × $0.015/GB = $0.0075/month
- Bandwidth: FREE (no egress fees)

**Recommendation:** Start with Vercel Blob for simplicity, migrate to R2 if costs become significant.
