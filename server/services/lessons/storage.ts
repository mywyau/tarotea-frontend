import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createError } from "h3";
import { r2Client } from "~/server/utils/r2";

function objectRequest(directory: string, filename: string) {
  const bucket = process.env.R2_LESSON_BUCKET_NAME;
  if (!bucket) throw createError({ statusCode: 503, statusMessage: "Lesson storage is not configured" });
  return new GetObjectCommand({
    Bucket: bucket,
    Key: `${directory}/${filename}`,
    ResponseCacheControl: "private, no-store",
  });
}

export function contentSlug(value: string | undefined) {
  if (!value || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw createError({ statusCode: 404, statusMessage: "Content not found" });
  }
  return value;
}

type ContentDirectory = "words" | "sentences" | "topic-sentences" | "levels" | "topics" | "vocab-quiz";

export async function readLessonJson<T>(directory: ContentDirectory, id: string): Promise<T> {
  const command = objectRequest(directory, `${contentSlug(id)}.json`);
  try {
    const { Body } = await r2Client.send(command);
    if (!Body) throw new Error("Empty lesson object");
    return JSON.parse(await Body.transformToString()) as T;
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") {
      throw createError({ statusCode: 404, statusMessage: "Content not found" });
    }
    throw createError({ statusCode: 502, statusMessage: "Lesson storage unavailable" });
  }
}

export function signLessonRecording(directory: string, filename: string) {
  return getSignedUrl(r2Client, objectRequest(directory, filename), { expiresIn: 60 });
}
