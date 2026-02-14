# Vercel Blob ML Model Setup

Complete documentation for serving ML models via Vercel Blob storage.

## Overview

RaceDayAI uses 52 XGBoost models (13 per distance × 4 distances) totaling ~488MB. These models are too large to bundle with the application code, so they're served separately via Vercel Blob storage.

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

## Setup Instructions

### 1. Vercel Blob Storage

The Vercel Blob store is already configured:

- **Store name**: `racedayai-blob`
- **Token**: `BLOB_READ_WRITE_TOKEN` (set in Vercel environment variables)
- **Public URL base**: `https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/`

### 2. Environment Variables

Set on Vercel (already configured):

```bash
# Model version for versioned deployments
MODEL_VERSION=v1.0.0

# Blob storage token (optional - only needed for uploads)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_***
```

To verify:
```bash
vercel env ls
```

### 3. Upload Models to Blob

When models are updated, upload them using the script:

```bash
# Upload all models to Blob storage
pnpm upload-models

# Or specify a version
pnpm upload-models v1.1.0
```

This runs: `tsx scripts/upload-models-to-blob.ts`

### 4. Local Development Setup

For local development, create a `.env` file (already created):

```bash
# .env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_***"
MODEL_VERSION="v1.0.0"
```

## File Structure

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

## Performance

### Load Times

- **Local filesystem**: 425-561ms (cold start)
- **Vercel Blob**: ~150ms (cold start)
- **Cached in memory**: <10ms (subsequent requests)

### Model Sizes

- Individual model: 5-15 MB each
- Total model size: 488.30 MB (all 52 models)
- Per prediction: ~13 models loaded (varies by distance)

## Vercel Deployment

### Build Configuration

The models are NOT bundled with the application:

```json
// .gitignore
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

## Model Versioning

Models are versioned using path prefixes:

```
v1.0.0/ml-models/swim_sec_sprint.json
v1.1.0/ml-models/swim_sec_sprint.json
```

### Rolling Updates

To deploy new models without downtime:

1. Upload new models with new version:
   ```bash
   pnpm upload-models v1.1.0
   ```

2. Update `MODEL_VERSION` environment variable:
   ```bash
   vercel env add MODEL_VERSION
   # Enter: v1.1.0
   ```

3. Redeploy application:
   ```bash
   vercel --prod
   ```

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

## Cost Estimate

### Vercel Blob Pricing

- Storage: 500MB × $0.15/GB/month = **$0.075/month**
- Bandwidth: 10K predictions × 50MB avg × $0.10/GB = **$50/month**

**Total estimated cost: ~$50/month** for 10K predictions

### Alternative: Cloudflare R2

For higher traffic, consider migrating to Cloudflare R2:
- Storage: 500MB × $0.015/GB/month = $0.0075/month
- Bandwidth: FREE (no egress fees)

## Future Improvements

1. **Model Compression**: Use gzip/brotli to reduce transfer size by ~70%
2. **Lazy Loading**: Only load models when needed (partial implementation exists)
3. **Edge Functions**: Move model serving closer to users
4. **Model Caching**: Implement Redis cache for frequently-used models
5. **A/B Testing**: Support multiple model versions simultaneously

## Links

- **Vercel Blob Documentation**: https://vercel.com/docs/storage/vercel-blob
- **Inngest Documentation**: https://www.inngest.com/docs
- **XGBoost Format**: https://xgboost.readthedocs.io/en/stable/tutorials/saving_model.html

## Support

For issues or questions:
1. Check Vercel deployment logs: `vercel logs`
2. Check Inngest function logs: https://app.inngest.com
3. Run test scripts locally to verify setup
4. Review this documentation for troubleshooting steps
