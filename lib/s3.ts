import "server-only";
import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET_NAME;

if (!region || !bucket) {
  throw new Error("Missing AWS_REGION or S3_BUCKET_NAME in your environment");
}

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Short window to complete the upload PUT.
const UPLOAD_URL_TTL_SECONDS = 60 * 5; // 5 minutes
// Long window for GETs: OpenRouter fetches the image URL directly during a
// generation run, so the presigned URL must outlive the whole run.
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60 * 12; // 12 hours

/**
 * Mint a presigned PUT URL for a new object and return both the object key
 * (stored in the DB) and the upload URL. Replaces Convex `generateUploadUrl`.
 */
export async function createUploadUrl(userId: string, contentType: string) {
  const key = `uploads/${userId}/${randomUUID()}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS }
  );
  return { key, uploadUrl };
}

/**
 * Upload raw image bytes (e.g. an agent-captured screenshot) straight to S3 and
 * return the object key. Server-side counterpart to `createUploadUrl` — no
 * presigned round-trip, since the caller already holds the bytes.
 */
export async function uploadImageBuffer(
  userId: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const ext = contentType.split("/")[1] || "png";
  const key = `uploads/${userId}/${randomUUID()}.${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/** Presigned GET URL for one object key. */
export async function getDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS }
  );
}

/**
 * Resolve many keys to presigned GET URLs. Mirrors Convex `getImageUrls`:
 * returns a `{ [key]: url | null }` map (null when a key fails to sign).
 */
export async function getDownloadUrls(
  keys: string[]
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    keys.map(async (key) => {
      try {
        return [key, await getDownloadUrl(key)] as const;
      } catch {
        return [key, null] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

/** Best-effort delete of object keys (used for cleanup). */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}
