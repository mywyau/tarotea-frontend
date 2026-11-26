import { requireLesson } from "~/server/services/lessons/access";
import { signLessonRecording } from "~/server/services/lessons/storage";
import { offlineWordForDay, utcDayNumber } from "~/utils/wordOfTheDay";

export default defineEventHandler(async event => {
  const voice = getRouterParam(event, "voice") || "";
  const file = getRouterParam(event, "file") || "";
  if (!["audio", "audio-male", "audio-female"].includes(voice) || !/^[a-zA-Z0-9_-]+\.mp3$/.test(file)) {
    throw createError({ statusCode: 404, statusMessage: "Recording not found" });
  }
  const id = file.replace(/(?:-example-\d+)?\.mp3$/, "");
  let featured = false;
  if (getQuery(event).featured === "1" && file === id + ".mp3") {
    featured = offlineWordForDay(utcDayNumber(Date.now())).audioFile === file;
    if (!featured) {
      const { today } = await $fetch("/api/word-of-the-day");
      featured = today.audioFile === file;
    }
  }
  if (!featured) await requireLesson(event, id);
  return { url: await signLessonRecording(voice, file) };
});
