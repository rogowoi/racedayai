import { put } from '@vercel/blob';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const VERSION = process.argv[2] || 'v1.0.0';
const MODELS_DIR = join(process.cwd(), 'apps/web/src/data/ml-models');

interface UploadResult {
  filename: string;
  url: string;
  size: number;
  success: boolean;
  error?: string;
}

async function uploadModels() {
  console.log(`Starting upload of ML models (version: ${VERSION})`);
  console.log(`Models directory: ${MODELS_DIR}\n`);

  // Check if BLOB_READ_WRITE_TOKEN is set
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN environment variable is not set. Please set it to your Vercel Blob token.'
    );
  }

  // Read all files from the models directory
  let files: string[];
  try {
    files = await readdir(MODELS_DIR);
  } catch (error) {
    throw new Error(`Failed to read models directory: ${error}`);
  }

  // Filter for JSON files only
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('No JSON files found in models directory');
    return;
  }

  console.log(`Found ${jsonFiles.length} JSON files to upload:\n`);

  const results: UploadResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Upload each file
  for (const filename of jsonFiles) {
    const filePath = join(MODELS_DIR, filename);
    const blobPath = `${VERSION}/ml-models/${filename}`;

    try {
      console.log(`Uploading ${filename}...`);

      // Read file content
      const fileContent = await readFile(filePath);
      const fileSize = fileContent.length;

      // Upload to Vercel Blob
      const blob = await put(blobPath, fileContent, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });

      successCount++;
      results.push({
        filename,
        url: blob.url,
        size: fileSize,
        success: true,
      });

      console.log(`  URL: ${blob.url}`);
      console.log(`  Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log('  Status: Success\n');
    } catch (error) {
      failureCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        filename,
        url: '',
        size: 0,
        success: false,
        error: errorMessage,
      });

      console.error(`  Status: Failed - ${errorMessage}\n`);
    }
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('Upload Summary');
  console.log('='.repeat(60));
  console.log(`Total files: ${jsonFiles.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Version: ${VERSION}\n`);

  if (successCount > 0) {
    console.log('Successfully uploaded files:');
    results
      .filter((r) => r.success)
      .forEach((r) => {
        console.log(`  - ${r.filename} (${(r.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`    ${r.url}`);
      });
    console.log();
  }

  if (failureCount > 0) {
    console.log('Failed uploads:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.filename}: ${r.error}`);
      });
    console.log();
  }

  // Calculate total size
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  console.log(`Total size uploaded: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  // Exit with error code if any uploads failed
  if (failureCount > 0) {
    process.exit(1);
  }
}

uploadModels().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
