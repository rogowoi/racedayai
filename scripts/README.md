# Scripts

## upload-models-to-blob.ts

Upload ML models from `apps/web/src/data/ml-models/` to Vercel Blob storage with versioning support.

### Prerequisites

- Set the `BLOB_READ_WRITE_TOKEN` environment variable with your Vercel Blob token
- Ensure @vercel/blob and tsx are installed (run `pnpm install` in the project root)

### Usage

```bash
# Upload with default version (v1.0.0)
BLOB_READ_WRITE_TOKEN=your_token_here pnpm tsx scripts/upload-models-to-blob.ts

# Upload with custom version
BLOB_READ_WRITE_TOKEN=your_token_here pnpm tsx scripts/upload-models-to-blob.ts v2.0.0

# Or set the token in your environment first
export BLOB_READ_WRITE_TOKEN=your_token_here
pnpm tsx scripts/upload-models-to-blob.ts v1.0.0
```

### Output Format

The script will:
1. List all JSON files found in the models directory
2. Upload each file to Vercel Blob with the path: `{version}/ml-models/{filename}`
3. Show progress for each file (filename, URL, size, status)
4. Display a summary at the end with:
   - Total files processed
   - Success/failure counts
   - List of successfully uploaded files with URLs
   - List of failed uploads with error messages
   - Total size uploaded

### Example Output

```
Starting upload of ML models (version: v1.0.0)
Models directory: /path/to/apps/web/src/data/ml-models

Found 16 JSON files to upload:

Uploading bike_np_70.3.json...
  URL: https://your-blob-url.vercel-storage.com/v1.0.0/ml-models/bike_np_70.3.json
  Size: 11.81 MB
  Status: Success

Uploading bike_sec_70.3.json...
  URL: https://your-blob-url.vercel-storage.com/v1.0.0/ml-models/bike_sec_70.3.json
  Size: 11.40 MB
  Status: Success

...

============================================================
Upload Summary
============================================================
Total files: 16
Successful: 16
Failed: 0
Version: v1.0.0

Successfully uploaded files:
  - bike_np_70.3.json (11.81 MB)
    https://your-blob-url.vercel-storage.com/v1.0.0/ml-models/bike_np_70.3.json
  - bike_sec_70.3.json (11.40 MB)
    https://your-blob-url.vercel-storage.com/v1.0.0/ml-models/bike_sec_70.3.json
  ...

Total size uploaded: 145.23 MB
```

### Configuration

The script uploads files with the following Vercel Blob options:
- `access: 'public'` - Files are publicly accessible
- `addRandomSuffix: false` - Uses deterministic URLs based on the path
- `contentType: 'application/json'` - Sets proper content type for JSON files

### Error Handling

- If `BLOB_READ_WRITE_TOKEN` is not set, the script will exit with an error
- If the models directory doesn't exist or can't be read, the script will exit with an error
- If any individual file upload fails, the script will continue with remaining files
- The script exits with code 1 if any uploads failed, code 0 if all succeeded
