import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createError } from "h3";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing environment variable: ${name}`,
    });
  }

  return value;
}

const accountId = getRequiredEnv("R2_ACCOUNT_ID");
const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

export const r2BucketName = getRequiredEnv("R2_BUCKET_NAME");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

type CreateEchoLabUploadUrlInput = {
  objectKey: string;
  contentType: string;
};

export async function createEchoLabUploadUrl({
  objectKey,
  contentType,
}: CreateEchoLabUploadUrlInput): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: 60,
  });
}