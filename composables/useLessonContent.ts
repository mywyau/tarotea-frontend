import type { WordEntry } from "~/types/word";

export async function lessonAuthHeaders() {
  if (import.meta.server) return undefined;
  const auth = await useAuth();
  const token = auth.isAuthenticated ? await auth.getAccessToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function fetchLessonWord(id: string) {
  const path = `/api/words/${encodeURIComponent(id)}` as const;
  return $fetch<WordEntry>(path, { headers: await lessonAuthHeaders() });
}

export async function resolveLessonAudio(src: string) {
  if (!src.startsWith("/api/lesson-audio/")) return src;
  const { url } = await $fetch<{ url: string }>(src, { headers: await lessonAuthHeaders() });
  return url;
}
