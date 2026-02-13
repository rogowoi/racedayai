import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "racedayai-gpx";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadGpx(key: string, content: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `gpx/${key}`,
      Body: content,
      ContentType: "application/gpx+xml",
    }),
  );
}

export async function getGpxUploadUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: `gpx/${key}`,
    ContentType: "application/gpx+xml",
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

export async function downloadGpx(key: string): Promise<string> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `gpx/${key}`,
    }),
  );
  return (await response.Body?.transformToString()) ?? "";
}

