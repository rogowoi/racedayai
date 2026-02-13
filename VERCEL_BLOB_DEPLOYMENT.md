# Vercel Blob ML Model Deployment Tutorial

A comprehensive guide to deploying machine learning models using Vercel Blob storage for serverless inference.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Install Dependencies](#step-1-install-dependencies)
4. [Step 2: Set Up Blob Store](#step-2-set-up-blob-store)
5. [Step 3: Upload Models](#step-3-upload-models)
6. [Step 4: Environment Variables](#step-4-environment-variables)
7. [Step 5: Update Code](#step-5-update-code)
8. [Step 6: Deploy](#step-6-deploy)
9. [Step 7: Verify](#step-7-verify)
10. [Model Versioning](#model-versioning)
11. [Troubleshooting](#troubleshooting)
12. [Cost Estimate](#cost-estimate)
13. [Future: Automated Retraining](#future-automated-retraining)

---

## Overview

### Why Vercel Blob for Model Serving?

**Current Situation:** This project stores ~140MB of XGBoost models in `/apps/web/src/data/ml-models/`, which are bundled with the Next.js application. This approach has several limitations:

**Problems with Bundle-Based Models:**
- **Large bundle size**: 140MB+ of model files increase deployment time
- **Cold starts**: Models must be loaded into memory on every serverless function cold start
- **Version management**: Updating models requires full application redeployment
- **Git bloat**: Binary model files in version control increase repository size
- **No rollback**: Cannot easily rollback to previous model versions without code deploy

**Benefits of Vercel Blob:**
- **Separation of concerns**: Models stored separately from application code
- **Faster deployments**: Application bundle stays small (<10MB)
- **Independent updates**: Update models without redeploying application
- **Built-in CDN**: Models cached at edge locations for faster access
- **Version control**: Built-in versioning with instant rollback
- **Cost-effective**: Pay only for storage and bandwidth used
- **Easy migration**: Compatible with existing XGBoost JSON models

**Use Cases:**
- **Development**: Rapid model iteration without full redeploys
- **Production**: Zero-downtime model updates with instant rollback
- **A/B Testing**: Serve different model versions to different users
- **Emergency rollback**: Revert to previous model version in seconds

---

## Prerequisites

Before starting, ensure you have:

- **Vercel account** with an active project
- **Vercel CLI** installed and authenticated (`/opt/homebrew/bin/vercel`)
- **Trained models** in XGBoost JSON format (see `/research/scripts/train_models.py`)
- **Node.js v20+** and **pnpm** installed
- **Project structure**: Next.js App Router with TypeScript

**Verify Prerequisites:**

```bash
# Check Vercel CLI authentication
vercel whoami

# Check Node version
node --version  # Should be v20+

# Check trained models exist
ls -lh apps/web/src/data/ml-models/*.json

# Verify models are exported
ls research/models/*.json 2>/dev/null || echo "Run: python -m research.scripts.export_artifacts"
```

---

## Step 1: Install Dependencies

Add the Vercel Blob SDK to your Next.js application.

### 1.1 Install Package

```bash
cd apps/web
pnpm add @vercel/blob
```

### 1.2 Verify Installation

```bash
# Check package.json
grep "@vercel/blob" package.json
```

**Expected output:**
```json
"@vercel/blob": "^0.23.4"
```

### 1.3 TypeScript Types (Optional)

The `@vercel/blob` package includes TypeScript definitions. No additional setup needed.

---

## Step 2: Set Up Blob Store

Create a Vercel Blob store through the dashboard and configure access tokens.

### 2.1 Create Blob Store via Dashboard

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project: **racedayai**
3. Go to **Storage** tab
4. Click **Create Database** → **Blob**
5. Name your store: `ml-models`
6. Click **Create**

**Screenshot description:**
```
┌─────────────────────────────────────┐
│ Create Blob Store                   │
├─────────────────────────────────────┤
│ Name: ml-models                     │
│ Region: Auto (recommended)          │
│                                     │
│ [Cancel]          [Create Store]   │
└─────────────────────────────────────┘
```

### 2.2 Get Access Token

After creation, Vercel automatically generates a `BLOB_READ_WRITE_TOKEN`.

**To view/copy token:**
1. Go to **Settings** → **Environment Variables**
2. Find `BLOB_READ_WRITE_TOKEN`
3. Click **Show** to reveal the token
4. Copy for local development

**Token format:**
```
vercel_blob_rw_ABCdef123XYZ_a1b2c3d4e5f6g7h8i9j0k1l2m3n4
```

---

## Step 3: Upload Models

Create a script to upload trained models to Vercel Blob storage.

### 3.1 Create Upload Script

Create `apps/web/scripts/upload-models-to-blob.ts`:

```typescript
/**
 * Upload trained ML models to Vercel Blob
 *
 * Usage:
 *   tsx scripts/upload-models-to-blob.ts [--version v1.2.0] [--dry-run]
 */

import { put, list, del } from '@vercel/blob';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

// Configuration
const MODEL_DIR = join(process.cwd(), 'src', 'data', 'ml-models');
const MODEL_PATTERNS = [
  'swim_sec_*.json',
  'swim_pace_*.json',
  'bike_sec_*.json',
  'bike_watts_*.json',
  'bike_np_*.json',
  'run_sec_*.json',
  'run_pace_*.json',
  'quantile_p*_*.json',
  'total_*.json',
  'imputation_tables.json',
  'feature_config.json',
  'model_metadata.json',
];

interface UploadOptions {
  version?: string;
  dryRun?: boolean;
  force?: boolean;
}

async function uploadModel(
  filePath: string,
  fileName: string,
  version: string,
  dryRun: boolean
): Promise<void> {
  const blobPath = `models/${version}/${fileName}`;

  if (dryRun) {
    console.log(`[DRY RUN] Would upload: ${fileName} → ${blobPath}`);
    return;
  }

  try {
    const fileContent = await readFile(filePath);
    const fileSize = (fileContent.length / (1024 * 1024)).toFixed(2);

    console.log(`Uploading ${fileName} (${fileSize} MB)...`);

    const blob = await put(blobPath, fileContent, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    console.log(`✓ Uploaded: ${blob.url}`);
  } catch (error) {
    console.error(`✗ Failed to upload ${fileName}:`, error);
    throw error;
  }
}

async function getModelFiles(): Promise<string[]> {
  const files = await readdir(MODEL_DIR);

  // Filter to only model files
  return files.filter(file =>
    file.endsWith('.json') && (
      file.startsWith('swim_') ||
      file.startsWith('bike_') ||
      file.startsWith('run_') ||
      file.startsWith('quantile_') ||
      file.startsWith('total_') ||
      file.includes('imputation_') ||
      file.includes('feature_config') ||
      file.includes('model_metadata')
    )
  );
}

async function listExistingVersions(): Promise<string[]> {
  const { blobs } = await list({ prefix: 'models/' });

  const versions = new Set<string>();
  blobs.forEach(blob => {
    const match = blob.pathname.match(/^models\/([^\/]+)\//);
    if (match) {
      versions.add(match[1]);
    }
  });

  return Array.from(versions).sort();
}

async function main() {
  const args = process.argv.slice(2);
  const options: UploadOptions = {
    version: args.find(arg => arg.startsWith('--version='))?.split('=')[1] ||
             `v${new Date().toISOString().split('T')[0]}`,
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
  };

  console.log('='.repeat(60));
  console.log('Vercel Blob Model Upload');
  console.log('='.repeat(60));
  console.log(`Version: ${options.version}`);
  console.log(`Dry Run: ${options.dryRun}`);
  console.log('');

  // Check if BLOB_READ_WRITE_TOKEN is set
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Error: BLOB_READ_WRITE_TOKEN not set');
    console.error('Run: vercel env pull .env.local');
    process.exit(1);
  }

  // List existing versions
  console.log('Existing versions:');
  const existingVersions = await listExistingVersions();
  if (existingVersions.length > 0) {
    existingVersions.forEach(v => console.log(`  - ${v}`));
  } else {
    console.log('  (none)');
  }
  console.log('');

  // Check if version already exists
  if (existingVersions.includes(options.version) && !options.force) {
    console.error(`❌ Error: Version ${options.version} already exists`);
    console.error('Use --force to overwrite or specify a different version');
    process.exit(1);
  }

  // Get model files
  const files = await getModelFiles();
  console.log(`Found ${files.length} model files to upload`);
  console.log('');

  // Upload each file
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = join(MODEL_DIR, file);
    try {
      await uploadModel(filePath, file, options.version, options.dryRun!);
      successCount++;
    } catch (error) {
      failCount++;
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Upload Summary');
  console.log('='.repeat(60));
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);

  if (!options.dryRun) {
    console.log('');
    console.log('Next steps:');
    console.log(`1. Set MODEL_VERSION="${options.version}" in environment variables`);
    console.log('2. Deploy: vercel --prod');
    console.log('3. Verify predictions work');
  }
}

main().catch(console.error);
```

### 3.2 Run Upload Script

```bash
# Dry run first (preview what will be uploaded)
tsx scripts/upload-models-to-blob.ts --dry-run

# Upload with automatic date-based version
tsx scripts/upload-models-to-blob.ts

# Upload with specific version
tsx scripts/upload-models-to-blob.ts --version=v1.0.0

# Force overwrite existing version
tsx scripts/upload-models-to-blob.ts --version=v1.0.0 --force
```

### 3.3 Verify Upload

```bash
# List all blobs
vercel blob ls

# List specific version
vercel blob ls --prefix=models/v1.0.0/
```

**Expected output:**
```
models/v1.0.0/swim_sec_70.3.json (11.4 MB)
models/v1.0.0/swim_pace_70.3.json (11.7 MB)
models/v1.0.0/bike_sec_70.3.json (12.0 MB)
...
Total: 18 files, 143.5 MB
```

---

## Step 4: Environment Variables

Configure environment variables for Blob access.

### 4.1 Local Development

Pull environment variables from Vercel:

```bash
cd apps/web
vercel env pull .env.local
```

This creates `.env.local` with:
```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

**Add model version:**
```bash
echo 'MODEL_VERSION="v1.0.0"' >> .env.local
```

### 4.2 Production Environment

Set environment variables in Vercel dashboard:

```bash
# Set model version for production
vercel env add MODEL_VERSION production

# When prompted, enter: v1.0.0

# Set for preview environments (optional)
vercel env add MODEL_VERSION preview
```

**Or use CLI:**
```bash
echo "v1.0.0" | vercel env add MODEL_VERSION production
echo "v1.0.0" | vercel env add MODEL_VERSION preview
```

### 4.3 Verify Variables

```bash
vercel env ls
```

**Expected output:**
```
name                      value        environments
BLOB_READ_WRITE_TOKEN     Encrypted    Production, Preview, Development
MODEL_VERSION             v1.0.0       Production, Preview, Development
```

---

## Step 5: Update Code

Modify model loading to fetch from Blob instead of local files.

### 5.1 Update Model Loader

Edit `apps/web/src/lib/ml/xgboost-inference.ts`:

```typescript
/**
 * XGBoost Model Loading (Vercel Blob)
 */

import { download } from '@vercel/blob';

// Model cache (in-memory for serverless functions)
const modelCache = new Map<string, any>();

interface BlobConfig {
  baseUrl: string;
  version: string;
}

function getBlobConfig(): BlobConfig {
  const version = process.env.MODEL_VERSION || 'v2026-02-13';
  const baseUrl = process.env.BLOB_BASE_URL || 'https://your-project.blob.vercel-storage.com';

  return { baseUrl, version };
}

/**
 * Load model from Vercel Blob with caching
 */
async function loadModelFromBlob(
  modelName: string,
  distance: string
): Promise<any> {
  const cacheKey = `${modelName}_${distance}`;

  // Check cache first
  if (modelCache.has(cacheKey)) {
    console.log(`Cache hit: ${cacheKey}`);
    return modelCache.get(cacheKey);
  }

  const { baseUrl, version } = getBlobConfig();
  const blobUrl = `${baseUrl}/models/${version}/${modelName}_${distance}.json`;

  console.log(`Loading model from Blob: ${blobUrl}`);

  try {
    // Download from Blob
    const response = await fetch(blobUrl);

    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.status} ${response.statusText}`);
    }

    const modelData = await response.json();

    // Parse XGBoost model
    const model = parseXGBoostModel(modelData);

    // Cache for subsequent requests
    modelCache.set(cacheKey, model);
    console.log(`Cached: ${cacheKey}`);

    return model;
  } catch (error) {
    console.error(`Error loading model ${modelName}:`, error);
    throw new Error(`Failed to load model ${modelName} from Blob: ${error}`);
  }
}

/**
 * Load all models for a distance
 */
export async function preloadModels(distance: string): Promise<{
  swim_sec: any;
  swim_pace: any;
  bike_sec: any;
  bike_watts: any;
  bike_np: any;
  run_sec: any;
  run_pace: any;
  quantiles: {
    p05: any;
    p25: any;
    p50: any;
    p75: any;
    p95: any;
  };
}> {
  console.log(`Preloading models for distance: ${distance}`);

  const [
    swim_sec,
    swim_pace,
    bike_sec,
    bike_watts,
    bike_np,
    run_sec,
    run_pace,
    p05,
    p25,
    p50,
    p75,
    p95,
  ] = await Promise.all([
    loadModelFromBlob('swim_sec', distance),
    loadModelFromBlob('swim_pace', distance),
    loadModelFromBlob('bike_sec', distance),
    loadModelFromBlob('bike_watts', distance),
    loadModelFromBlob('bike_np', distance),
    loadModelFromBlob('run_sec', distance),
    loadModelFromBlob('run_pace', distance),
    loadModelFromBlob('quantile_p05', distance),
    loadModelFromBlob('quantile_p25', distance),
    loadModelFromBlob('quantile_p50', distance),
    loadModelFromBlob('quantile_p75', distance),
    loadModelFromBlob('quantile_p95', distance),
  ]);

  return {
    swim_sec,
    swim_pace,
    bike_sec,
    bike_watts,
    bike_np,
    run_sec,
    run_pace,
    quantiles: { p05, p25, p50, p75, p95 },
  };
}

/**
 * Clear model cache (useful for testing new versions)
 */
export function clearModelCache(): void {
  modelCache.clear();
  console.log('Model cache cleared');
}

// Export for use in other modules
export { loadModelFromBlob };
```

### 5.2 Update Static Data Loader

Edit `apps/web/src/lib/ml/predict.ts`:

```typescript
/**
 * Load static data files from Blob
 */
async function loadJSON(path: string): Promise<any> {
  const { baseUrl, version } = getBlobConfig();
  const blobUrl = `${baseUrl}/models/${version}/${path}`;

  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }
  return response.json();
}

export async function loadStaticData(): Promise<{
  imputation: ImputationTables;
  config: FeatureConfig;
  metadata: ModelMetadata;
}> {
  const [imputation, config, metadata] = await Promise.all([
    loadJSON('imputation_tables.json'),
    loadJSON('feature_config.json'),
    loadJSON('model_metadata.json'),
  ]);

  return { imputation, config, metadata };
}
```

### 5.3 Add Model Version Endpoint (Optional)

Create `apps/web/src/app/api/model-version/route.ts`:

```typescript
/**
 * API endpoint to check current model version
 * Useful for debugging and monitoring
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const version = process.env.MODEL_VERSION || 'unknown';

  return NextResponse.json({
    version,
    timestamp: new Date().toISOString(),
  });
}
```

Test:
```bash
curl http://localhost:3000/api/model-version
```

---

## Step 6: Deploy

Deploy the updated application to Vercel.

### 6.1 Remove Old Models from Git

Since models are now in Blob storage, remove them from version control:

```bash
# Move models to backup (don't delete yet)
mkdir -p ~/model-backup
cp -r apps/web/src/data/ml-models ~/model-backup/

# Update .gitignore
echo "apps/web/src/data/ml-models/*.json" >> apps/web/.gitignore

# Keep directory structure but remove JSON files
cd apps/web/src/data/ml-models
git rm *.json

# Create placeholder README
cat > README.md << 'EOF'
# ML Models

Models are stored in Vercel Blob storage and loaded at runtime.

To update models:
1. Train models: `python -m research.scripts.train_models`
2. Export artifacts: `python -m research.scripts.export_artifacts`
3. Upload to Blob: `tsx scripts/upload-models-to-blob.ts --version=vX.Y.Z`
4. Update MODEL_VERSION environment variable
5. Deploy
EOF

git add README.md .gitignore
git commit -m "Move ML models to Vercel Blob storage"
```

### 6.2 Deploy to Vercel

```bash
# Deploy to preview first (test environment)
vercel

# If preview works, deploy to production
vercel --prod
```

### 6.3 Monitor Deployment

```bash
# Watch deployment logs
vercel logs --follow

# Check deployment status
vercel inspect [deployment-url]
```

---

## Step 7: Verify

Test that predictions work correctly with Blob-loaded models.

### 7.1 Local Testing

```bash
# Start dev server
pnpm dev

# Test prediction endpoint
curl -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "distance": "70.3",
    "age": 35,
    "gender": "M",
    "pb_total_sec": 19800,
    "swim_strength_z": 0.2,
    "bike_strength_z": 0.5,
    "run_strength_z": 0.3
  }'
```

**Expected response:**
```json
{
  "totalSeconds": 19234,
  "segments": {
    "swim": {
      "seconds": 1834,
      "pacePer100m": 96.8
    },
    "bike": {
      "seconds": 11456,
      "avgWatts": 245,
      "normalizedWatts": 260,
      "intensityFactor": 0.83
    },
    "run": {
      "seconds": 5644,
      "avgPacePerKm": 267,
      "avgPacePerMile": 430
    }
  },
  "confidence": "high",
  "tier": 3
}
```

### 7.2 Production Testing

```bash
# Test production endpoint
curl -X POST https://racedayai.com/api/predict \
  -H "Content-Type: application/json" \
  -d '{...}'

# Check model version
curl https://racedayai.com/api/model-version
```

### 7.3 Verify Performance

Monitor cold start times and response times:

```bash
# Check Vercel logs for performance metrics
vercel logs --output json | jq '.[] | select(.message | contains("Loading model"))'
```

**Expected metrics:**
- **First request (cold start)**: 2-4 seconds (model download + parsing)
- **Subsequent requests (cached)**: 200-500ms (prediction only)
- **Memory usage**: 150-250 MB per serverless function

### 7.4 Automated Testing

Create `apps/web/test/integration/blob-models.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import { predictRaceTime } from '@/lib/ml/predict';

describe('Blob Model Integration', () => {
  it('should load models from Blob', async () => {
    const input = {
      age: 35,
      gender: 'M' as const,
      pb_total_sec: 19800,
      swim_strength_z: 0.2,
      bike_strength_z: 0.5,
      run_strength_z: 0.3,
      total_races: 5,
    };

    const prediction = await predictRaceTime(input, '70.3');

    expect(prediction.totalSeconds).toBeGreaterThan(0);
    expect(prediction.segments.swim.seconds).toBeGreaterThan(0);
    expect(prediction.segments.bike.seconds).toBeGreaterThan(0);
    expect(prediction.segments.run.seconds).toBeGreaterThan(0);
  });

  it('should cache models between requests', async () => {
    const input = { /* ... */ };

    const start1 = Date.now();
    await predictRaceTime(input, '70.3');
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await predictRaceTime(input, '70.3');
    const time2 = Date.now() - start2;

    // Second request should be faster (cached)
    expect(time2).toBeLessThan(time1 * 0.5);
  });
});
```

Run tests:
```bash
pnpm test blob-models
```

---

## Model Versioning

Implement a robust versioning strategy for zero-downtime model updates.

### 10.1 Versioning Strategy

**Semantic Versioning:**
- `vMAJOR.MINOR.PATCH` (e.g., `v1.2.3`)
- **MAJOR**: Breaking changes (new features, different input format)
- **MINOR**: New models (additional distances, improved accuracy)
- **PATCH**: Bug fixes (re-exports, metadata updates)

**Date-Based Versioning:**
- `vYYYY-MM-DD` (e.g., `v2026-02-13`)
- Use for daily/weekly model updates
- Simpler for tracking when models were trained

### 10.2 Upload New Version

```bash
# Train new models
cd research
python -m scripts.train_models --distances=sprint,olympic,70.3,140.6

# Export artifacts
python -m scripts.export_artifacts

# Upload to Blob with new version
cd ../apps/web
tsx scripts/upload-models-to-blob.ts --version=v1.1.0
```

### 10.3 Gradual Rollout

Test new version in preview environment before production:

```bash
# Set new version for preview only
vercel env add MODEL_VERSION preview
# Enter: v1.1.0

# Deploy to preview
vercel

# Test preview deployment
curl https://racedayai-preview-abc123.vercel.app/api/model-version

# If tests pass, update production
vercel env add MODEL_VERSION production
# Enter: v1.1.0

vercel --prod
```

### 10.4 A/B Testing (Advanced)

Serve different model versions to different users:

Create `apps/web/src/lib/ml/version-selector.ts`:

```typescript
/**
 * Select model version based on user ID or feature flag
 */

export function getModelVersion(userId?: string): string {
  // Default version
  const defaultVersion = process.env.MODEL_VERSION || 'v1.0.0';

  // Feature flag for canary testing
  const canaryVersion = process.env.MODEL_VERSION_CANARY;
  const canaryPercent = parseInt(process.env.CANARY_PERCENT || '0', 10);

  if (!canaryVersion || canaryPercent === 0) {
    return defaultVersion;
  }

  // Canary testing: route X% of users to new version
  if (userId) {
    const hash = hashUserId(userId);
    if (hash % 100 < canaryPercent) {
      return canaryVersion;
    }
  }

  return defaultVersion;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

Update environment variables:
```bash
vercel env add MODEL_VERSION_CANARY production
# Enter: v1.1.0

vercel env add CANARY_PERCENT production
# Enter: 10

# This routes 10% of users to v1.1.0, 90% to stable version
```

### 10.5 Instant Rollback

If new model has issues, rollback immediately:

```bash
# Check current version
vercel env ls | grep MODEL_VERSION

# Rollback to previous version
vercel env add MODEL_VERSION production
# Enter: v1.0.0

# Changes take effect immediately (no redeploy needed!)
```

Verify rollback:
```bash
curl https://racedayai.com/api/model-version
```

### 10.6 Cleanup Old Versions

Remove old model versions to save storage costs:

```bash
# List all versions
vercel blob ls --prefix=models/

# Delete specific version
vercel blob rm --prefix=models/v1.0.0/

# Or use script
tsx scripts/cleanup-old-models.ts --keep-latest=3
```

Create `apps/web/scripts/cleanup-old-models.ts`:

```typescript
import { list, del } from '@vercel/blob';

async function cleanup(keepLatest: number = 3) {
  const { blobs } = await list({ prefix: 'models/' });

  // Group by version
  const versions = new Map<string, string[]>();
  blobs.forEach(blob => {
    const match = blob.pathname.match(/^models\/([^\/]+)\//);
    if (match) {
      const version = match[1];
      if (!versions.has(version)) {
        versions.set(version, []);
      }
      versions.get(version)!.push(blob.url);
    }
  });

  // Sort versions (newest first)
  const sortedVersions = Array.from(versions.keys()).sort().reverse();

  // Delete old versions
  const toDelete = sortedVersions.slice(keepLatest);
  console.log(`Keeping ${keepLatest} latest versions`);
  console.log(`Deleting ${toDelete.length} old versions:`, toDelete);

  for (const version of toDelete) {
    const urls = versions.get(version)!;
    console.log(`Deleting version ${version} (${urls.length} files)...`);
    await Promise.all(urls.map(url => del(url)));
  }

  console.log('Cleanup complete');
}

// Parse CLI args
const keepLatest = parseInt(process.argv[2] || '3', 10);
cleanup(keepLatest).catch(console.error);
```

---

## Troubleshooting

Common issues and solutions.

### 11.1 BLOB_READ_WRITE_TOKEN Not Set

**Error:**
```
Error: Missing environment variable BLOB_READ_WRITE_TOKEN
```

**Solution:**
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Or set manually
export BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

### 11.2 Model Not Found

**Error:**
```
Failed to load model swim_sec_70.3: 404 Not Found
```

**Possible causes:**
1. Model not uploaded to Blob
2. Wrong version specified
3. Typo in model name

**Solution:**
```bash
# Check what's in Blob
vercel blob ls --prefix=models/

# Verify version
echo $MODEL_VERSION

# Re-upload models
tsx scripts/upload-models-to-blob.ts --version=$MODEL_VERSION --force
```

### 11.3 Large Model Files Cause Timeouts

**Error:**
```
Error: Request timeout after 10s
```

**Solution:**

Increase serverless function timeout in `vercel.json`:

```json
{
  "functions": {
    "apps/web/src/app/api/predict/route.ts": {
      "maxDuration": 30
    }
  }
}
```

Or use Edge Runtime for faster cold starts:

```typescript
// apps/web/src/app/api/predict/route.ts
export const runtime = 'edge';
```

### 11.4 Out of Memory Errors

**Error:**
```
Error: JavaScript heap out of memory
```

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

Or optimize model loading (lazy load only needed models):

```typescript
// Only load models for requested distance
async function preloadModels(distance: string) {
  // Load only swim/bike/run for this distance
  // Don't load all distances at once
}
```

### 11.5 Slow Cold Starts

**Problem:** First request takes 5-10 seconds.

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

4. **Reduce Model Size:**
   ```python
   # When training models, use smaller max_depth
   params = {
       'max_depth': 6,  # Instead of 8
       'n_estimators': 100,  # Instead of 200
   }
   ```

### 11.6 Incorrect Predictions

**Problem:** Predictions don't match local testing.

**Debug steps:**

1. **Check model version:**
   ```bash
   curl https://racedayai.com/api/model-version
   ```

2. **Compare model URLs:**
   ```typescript
   console.log('Loading from:', blobUrl);
   ```

3. **Verify model hashes:**
   ```bash
   # Download from Blob
   curl https://your-blob-url.vercel-storage.com/models/v1.0.0/swim_sec_70.3.json > remote.json

   # Compare with local
   diff apps/web/src/data/ml-models/swim_sec_70.3.json remote.json
   ```

4. **Test with known inputs:**
   ```typescript
   // Use test cases with known expected outputs
   const testCases = [
     { input: {...}, expected: 19234 },
   ];
   ```

### 11.7 CORS Errors in Browser

**Error:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution:**

Vercel Blob has CORS enabled by default for public access. If you see this error:

1. Ensure `access: 'public'` when uploading:
   ```typescript
   await put(blobPath, fileContent, {
     access: 'public',  // Important!
   });
   ```

2. Or configure CORS in `vercel.json`:
   ```json
   {
     "headers": [
       {
         "source": "/api/(.*)",
         "headers": [
           { "key": "Access-Control-Allow-Origin", "value": "*" }
         ]
       }
     ]
   }
   ```

---

## Cost Estimate

Understand expected costs for Vercel Blob storage and bandwidth.

### 12.1 Storage Costs

**Vercel Blob Pricing (as of 2026-02):**
- Storage: $0.15 per GB per month
- Bandwidth: $0.10 per GB

**Current Model Storage:**
- 18 files × 8 MB average = 144 MB = 0.14 GB
- Monthly cost: **$0.021/month** (~$0.25/year)

**With Multiple Versions:**
- 3 versions × 144 MB = 432 MB = 0.42 GB
- Monthly cost: **$0.063/month** (~$0.76/year)

### 12.2 Bandwidth Costs

**Assumptions:**
- Average prediction: 144 MB models loaded (first request only, then cached)
- Cache hit rate: 95% (models stay in memory)
- 1,000 predictions/day
- Cold starts: 50/day (5% of requests)

**Bandwidth usage:**
- Cold starts: 50 × 144 MB = 7.2 GB/day = 216 GB/month
- Monthly cost: **$21.60/month**

**Optimization:**
- With Edge Runtime and proper caching: **~$5-10/month**

### 12.3 Comparison: Bundle vs Blob

**Current Setup (Models in Bundle):**
- Build time: 5-8 minutes
- Bundle size: 140 MB
- Cold start: 3-5 seconds
- Storage cost: $0 (included in Vercel plan)
- Deployment cost: $0

**Blob Setup:**
- Build time: 1-2 minutes (75% faster)
- Bundle size: <10 MB (93% smaller)
- Cold start: 2-4 seconds (initial), 200ms (cached)
- Storage cost: $0.02/month (negligible)
- Bandwidth cost: $5-20/month (depends on traffic)

**Break-even point:** ~1,000-5,000 predictions/month

### 12.4 Cost Optimization Tips

1. **Aggressive caching:**
   ```typescript
   // Cache models in memory for 1 hour
   const CACHE_TTL = 3600 * 1000;
   ```

2. **Lazy loading:**
   ```typescript
   // Only load models when needed, not all at once
   if (distance === '70.3') {
     await loadModelFromBlob('swim_sec', '70.3');
   }
   ```

3. **Use Edge Runtime:**
   ```typescript
   export const runtime = 'edge';  // Faster, cheaper
   ```

4. **CDN caching:**
   ```typescript
   export const revalidate = 3600;  // Cache at edge
   ```

5. **Compress models:**
   ```bash
   # Use gzip compression when uploading
   gzip swim_sec_70.3.json
   ```

---

## Future: Automated Retraining

Set up automated model retraining and deployment using Inngest.

### 13.1 Architecture Overview

```
┌─────────────────┐
│   Cron Trigger  │ (Every Sunday 2am)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Inngest Job    │
│  "retrain"      │
└────────┬────────┘
         │
         ├──► Fetch latest data from DB
         │
         ├──► Train models (Python subprocess)
         │
         ├──► Validate metrics (MAE, R²)
         │
         ├──► Upload to Blob (new version)
         │
         ├──► Run A/B test (10% canary)
         │
         └──► Send notification (email/Slack)
```

### 13.2 Create Inngest Function

Create `apps/web/src/inngest/functions/retrain-models.ts`:

```typescript
import { inngest } from '../client';
import { spawn } from 'child_process';
import { put } from '@vercel/blob';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export const retrainModels = inngest.createFunction(
  {
    id: 'retrain-models',
    name: 'Retrain ML Models',
    // Run every Sunday at 2am UTC
    cron: '0 2 * * 0',
  },
  { event: 'ml/retrain.requested' },
  async ({ event, step }) => {
    // Step 1: Fetch latest data
    await step.run('fetch-data', async () => {
      console.log('Fetching latest race results...');
      // Query database for new results since last training
      // Export to CSV for Python scripts
      return { recordCount: 1234 };
    });

    // Step 2: Train models
    const metrics = await step.run('train-models', async () => {
      console.log('Training models...');

      return new Promise((resolve, reject) => {
        const trainProcess = spawn('python', [
          '-m',
          'research.scripts.train_models',
          '--distances=sprint,olympic,70.3,140.6',
          '--output-dir=research/models',
        ], {
          cwd: process.cwd(),
          env: process.env,
        });

        let output = '';
        trainProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        trainProcess.on('close', (code) => {
          if (code === 0) {
            // Parse metrics from output
            const mae = parseFloat(output.match(/MAE: ([\d.]+)/)?.[1] || '0');
            const r2 = parseFloat(output.match(/R²: ([\d.]+)/)?.[1] || '0');
            resolve({ mae, r2 });
          } else {
            reject(new Error(`Training failed with code ${code}`));
          }
        });
      });
    });

    // Step 3: Validate metrics
    await step.run('validate-metrics', async () => {
      const { mae, r2 } = metrics;

      // Define thresholds
      const MAX_MAE = 600; // 10 minutes
      const MIN_R2 = 0.85;

      if (mae > MAX_MAE || r2 < MIN_R2) {
        throw new Error(
          `Model quality below threshold: MAE=${mae}s, R²=${r2}`
        );
      }

      console.log(`✓ Validation passed: MAE=${mae}s, R²=${r2}`);
      return { passed: true };
    });

    // Step 4: Export artifacts
    await step.run('export-artifacts', async () => {
      console.log('Exporting artifacts...');

      return new Promise((resolve, reject) => {
        const exportProcess = spawn('python', [
          '-m',
          'research.scripts.export_artifacts',
          '--input-dir=research/models',
          '--output-dir=apps/web/src/data/ml-models',
        ]);

        exportProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            reject(new Error(`Export failed with code ${code}`));
          }
        });
      });
    });

    // Step 5: Upload to Blob
    const version = await step.run('upload-to-blob', async () => {
      const version = `v${new Date().toISOString().split('T')[0]}`;
      console.log(`Uploading models to Blob (version: ${version})...`);

      const modelDir = join(process.cwd(), 'apps/web/src/data/ml-models');
      const files = await readdir(modelDir);

      // Upload all model files
      await Promise.all(
        files
          .filter(f => f.endsWith('.json'))
          .map(async (file) => {
            const content = await readFile(join(modelDir, file));
            const blobPath = `models/${version}/${file}`;

            await put(blobPath, content, {
              access: 'public',
              addRandomSuffix: false,
            });
          })
      );

      return version;
    });

    // Step 6: Set canary version (A/B test with 10%)
    await step.run('set-canary', async () => {
      console.log(`Setting canary version: ${version}`);

      // Update environment variable via Vercel API
      await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'MODEL_VERSION_CANARY',
          value: version,
          target: ['production'],
        }),
      });

      return { canaryVersion: version, canaryPercent: 10 };
    });

    // Step 7: Send notification
    await step.run('notify', async () => {
      console.log('Sending notification...');

      // Send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'notifications@racedayai.com',
          to: 'team@racedayai.com',
          subject: `Models Retrained: ${version}`,
          html: `
            <h2>Model Retraining Complete</h2>
            <p><strong>Version:</strong> ${version}</p>
            <p><strong>Metrics:</strong></p>
            <ul>
              <li>MAE: ${metrics.mae}s</li>
              <li>R²: ${metrics.r2}</li>
            </ul>
            <p><strong>Status:</strong> Canary testing (10% of traffic)</p>
            <p>Monitor for 24 hours, then promote to stable if no issues.</p>
          `,
        }),
      });

      return { sent: true };
    });

    return {
      success: true,
      version,
      metrics,
    };
  }
);
```

### 13.3 Register Function

Update `apps/web/src/inngest/functions/index.ts`:

```typescript
import { retrainModels } from './retrain-models';
import { predictRaceTime } from './predict-race-time';

export const functions = [
  retrainModels,
  predictRaceTime,
];
```

### 13.4 Manual Trigger (Testing)

```bash
# Trigger retraining manually
curl -X POST http://localhost:3000/api/inngest \
  -H "Content-Type: application/json" \
  -d '{"name": "ml/retrain.requested", "data": {}}'

# Check status
curl http://localhost:3000/api/inngest/runs
```

### 13.5 Monitoring & Rollback

Create dashboard to monitor model performance:

```typescript
// apps/web/src/app/admin/models/page.tsx

export default async function ModelsPage() {
  // Fetch current and canary versions
  const currentVersion = process.env.MODEL_VERSION;
  const canaryVersion = process.env.MODEL_VERSION_CANARY;

  // Fetch recent predictions and errors
  const predictions = await db.prediction.findMany({
    where: { createdAt: { gte: subDays(new Date(), 7) } },
    select: {
      modelVersion: true,
      predictionTime: true,
      errorRate: true,
    },
  });

  // Compare metrics by version
  const currentMetrics = predictions.filter(p => p.modelVersion === currentVersion);
  const canaryMetrics = predictions.filter(p => p.modelVersion === canaryVersion);

  return (
    <div>
      <h1>Model Versions</h1>

      <div>
        <h2>Current (Stable): {currentVersion}</h2>
        <p>Error Rate: {calculateErrorRate(currentMetrics)}%</p>
        <p>Avg Response Time: {calculateAvgTime(currentMetrics)}ms</p>
      </div>

      <div>
        <h2>Canary: {canaryVersion}</h2>
        <p>Error Rate: {calculateErrorRate(canaryMetrics)}%</p>
        <p>Avg Response Time: {calculateAvgTime(canaryMetrics)}ms</p>
      </div>

      <button onClick={() => promoteCanary()}>
        Promote Canary to Stable
      </button>

      <button onClick={() => rollbackCanary()}>
        Rollback Canary
      </button>
    </div>
  );
}
```

### 13.6 Automated Promotion

After 24 hours of successful canary testing, automatically promote:

```typescript
// apps/web/src/inngest/functions/promote-canary.ts

export const promoteCanary = inngest.createFunction(
  {
    id: 'promote-canary',
    name: 'Promote Canary Model to Stable',
    // Run 24 hours after retraining
    cron: '0 2 * * 1',  // Monday 2am (1 day after retraining)
  },
  { event: 'ml/promote.canary' },
  async ({ event, step }) => {
    // Check canary metrics
    const metrics = await step.run('check-metrics', async () => {
      // Query error rates, prediction times, etc.
      return { errorRate: 0.02, avgTime: 450 };
    });

    // If metrics are good, promote to stable
    if (metrics.errorRate < 0.05 && metrics.avgTime < 1000) {
      await step.run('promote', async () => {
        const canaryVersion = process.env.MODEL_VERSION_CANARY;

        // Update MODEL_VERSION to canary version
        await fetch(`https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/env`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'MODEL_VERSION',
            value: canaryVersion,
            target: ['production'],
          }),
        });

        console.log(`✓ Promoted ${canaryVersion} to stable`);
      });
    } else {
      // Rollback if metrics are poor
      await step.run('rollback', async () => {
        console.log('❌ Canary metrics below threshold, rolling back');
        // Keep current stable version
      });
    }
  }
);
```

---

## Conclusion

You now have a complete Vercel Blob deployment pipeline for ML models with:

- **Fast deployments**: Models separated from code bundle
- **Zero-downtime updates**: Update models without redeploying
- **Version control**: Easy rollback to previous versions
- **A/B testing**: Gradual rollout with canary deployments
- **Automated retraining**: Weekly model updates with Inngest
- **Cost optimization**: Pay only for what you use

### Key Takeaways

1. **Separation of concerns**: Models in Blob, code in Git
2. **Caching is critical**: Keep models in memory to avoid repeated downloads
3. **Versioning is easy**: Upload new version, update env var, done
4. **Monitoring is essential**: Track error rates and performance by version
5. **Automate everything**: Use Inngest for retraining and deployment

### Next Steps

1. Migrate existing models to Blob storage
2. Set up monitoring dashboard for model performance
3. Implement automated retraining pipeline
4. Test A/B deployment with canary releases
5. Optimize for cost (caching, compression, lazy loading)

---

**Questions or Issues?**

- Vercel Blob Docs: https://vercel.com/docs/storage/vercel-blob
- Inngest Docs: https://www.inngest.com/docs
- XGBoost Docs: https://xgboost.readthedocs.io/

**Author:** Claude Code
**Date:** 2026-02-13
**Version:** 1.0
