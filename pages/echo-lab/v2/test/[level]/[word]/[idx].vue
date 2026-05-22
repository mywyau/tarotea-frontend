<script setup lang="ts">
import {
    Mic,
    Play,
    RotateCcw,
    Send,
    Square,
    XCircle,
} from "@lucide/vue";

import {
    MAX_AUDIO_BYTES,
    MAX_RECORDING_SECONDS,
} from "~/config/audio_config";

definePageMeta({
    ssr: false,
    middleware: [
        "coming-soon",
        "logged-in",
        "word-access"
    ],
});

type AudioVoice = "male" | "female";

type WordResponse = {
    examples?: Array<{
        sentence?: string;
        jyutping?: string;
        meaning?: string;
    }>;
    audio?: {
        examples?: string[];
    };
};

type CreateEchoLabAttemptResponse = {
    attemptId: string;
    status: string;
    wordId: string;
    exampleIndex: number;
    scope: string | null;
    slug: string | null;
    audioObjectKey: string;
    uploadUrl: string;
    uploadContentType: string;
    expectedChinese: string | null;
    expectedJyutping: string | null;
    createdAt: string;
};

type UploadDebug = {
    ok: boolean;
    status: number;
    statusText: string;
};

type CompleteUploadResponse = {
    attemptId: string;
    status: string;
    wordId: string;
    exampleIndex: number;
    scope: string | null;
    slug: string | null;
    audioObjectKey: string;
    expectedChinese: string | null;
    expectedJyutping: string | null;
    createdAt: string;
};

type AttemptStatusResponse = {
    attemptId: string;
    status: string;
    wordId: string;
    exampleIndex: number;
    scope: string | null;
    slug: string | null;
    audioObjectKey: string;
    transcript: string | null;
    expectedChinese: string | null;
    expectedJyutping: string | null;
    score: number | null;
    matchType: string | null;
    confidence: number | null;
    feedback: unknown | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: string;
    queuedAt: string | null;
    processingAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
};

type QueueAttemptResponse = {
    attemptId: string;
    status: string;
    wordId: string;
    exampleIndex: number;
    scope: string | null;
    slug: string | null;
    audioObjectKey: string;
    expectedChinese: string | null;
    expectedJyutping: string | null;
    createdAt: string;
    queuedAt: string | null;
};

const route = useRoute();
const runtimeConfig = useRuntimeConfig();

const cdnBase = runtimeConfig.public.cdnBase;

const selectedAudioVoice = useCookie<AudioVoice>("audio-voice", {
    default: () => "male",
    sameSite: "lax",
});

const audioDirectory = computed(() =>
    selectedAudioVoice.value === "female" ? "audio-female" : "audio-male",
);

const queuedAttemptDebug = ref<QueueAttemptResponse | null>(null);

const playbackRate = ref(1);
const attemptStatusDebug = ref<AttemptStatusResponse | null>(null);

const wordSlug = computed(() =>
    decodeURIComponent(String(route.params.word ?? "")),
);

const levelSlug = computed(() => String(route.params.level ?? ""));

const idx = computed(() => {
    const raw = route.params.idx as string | undefined;
    const parsed = Number.parseInt(raw ?? "", 10);

    return Number.isNaN(parsed) ? 0 : parsed;
});

const { data, error } = await useAsyncData<WordResponse>(
    () => `echo-lab-upload-test-word-${wordSlug.value}`,
    () => $fetch(`/api/words/${wordSlug.value}`),
    {
        server: false,
        watch: [wordSlug],
    },
);

const word = computed(() => data.value);

const selectedExample = computed(() => {
    return word.value?.examples?.[idx.value] ?? null;
});

const practiceTarget = computed(() => {
    const example = selectedExample.value;

    if (!example?.sentence || !example?.jyutping || !example?.meaning) {
        return null;
    }

    return {
        chinese: example.sentence,
        jyutping: example.jyutping,
        meaning: example.meaning,
    };
});

const phraseAudioSrc = computed(() => {
    const filename = word.value?.audio?.examples?.[idx.value];

    return filename ? `${cdnBase}/${audioDirectory.value}/${filename}` : null;
});

const supported = ref(false);
const recording = ref(false);
const loading = ref(false);
const aiState = ref<"" | "error" | "success">("");
const recordingTime = ref(0);

const recordingUrl = ref<string | null>(null);
const recordingAudio = ref<HTMLAudioElement | null>(null);
const mediaRecorder = ref<MediaRecorder | null>(null);
const streamRef = ref<MediaStream | null>(null);
const recorderMimeType = ref("");

const recordedBlob = ref<Blob | null>(null);
const cancelRequested = ref(false);

const attemptDebug = ref<CreateEchoLabAttemptResponse | null>(null);
const uploadDebug = ref<UploadDebug | null>(null);
const errorMessage = ref("");

const completedUploadDebug = ref<CompleteUploadResponse | null>(null);

let timer: ReturnType<typeof setInterval> | null = null;
let audioChunks: Blob[] = [];

const progress = computed(() => {
    return Math.min((recordingTime.value / MAX_RECORDING_SECONDS) * 100, 100);
});

function getSupportedMimeType() {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
    ];

    for (const type of candidates) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }

    return "";
}

function stopTracks() {
    streamRef.value?.getTracks().forEach((track) => track.stop());
    streamRef.value = null;
}

function clearRecordingTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function clearSavedRecording() {
    if (recordingUrl.value) {
        URL.revokeObjectURL(recordingUrl.value);
        recordingUrl.value = null;
    }

    recordedBlob.value = null;
}

function resetDebug() {
    attemptDebug.value = null;
    uploadDebug.value = null;
    completedUploadDebug.value = null;
    attemptStatusDebug.value = null;
    queuedAttemptDebug.value = null;
    errorMessage.value = "";
    aiState.value = "";
}

function resetRecording() {
    clearSavedRecording();
    clearRecordingTimer();
    stopTracks();

    audioChunks = [];
    cancelRequested.value = false;
    mediaRecorder.value = null;
    recording.value = false;
    loading.value = false;
    recordingTime.value = 0;
    recorderMimeType.value = "";

    resetDebug();
}

async function replayRecording() {
    const audio = recordingAudio.value;
    if (!audio) return;

    audio.currentTime = 0;
    await audio.play();
}

async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
        aiState.value = "error";
        errorMessage.value = "Your browser does not support microphone recording.";
        return;
    }

    if (!practiceTarget.value) {
        aiState.value = "error";
        errorMessage.value = "Missing practice target.";
        return;
    }

    try {
        resetDebug();
        clearSavedRecording();

        audioChunks = [];
        cancelRequested.value = false;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.value = stream;

        const supportedMimeType = getSupportedMimeType();

        mediaRecorder.value = supportedMimeType
            ? new MediaRecorder(stream, { mimeType: supportedMimeType })
            : new MediaRecorder(stream);

        recorderMimeType.value =
            mediaRecorder.value.mimeType || supportedMimeType || "audio/webm";

        mediaRecorder.value.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.value.onstop = async () => {
            try {
                const audioBlob = new Blob(audioChunks, {
                    type: recorderMimeType.value,
                });

                audioChunks = [];

                if (cancelRequested.value) {
                    cancelRequested.value = false;
                    clearSavedRecording();
                    return;
                }

                if (audioBlob.size < 1000) {
                    aiState.value = "error";
                    errorMessage.value = "Recording was too small. Please try again.";
                    return;
                }

                if (audioBlob.size > MAX_AUDIO_BYTES) {
                    aiState.value = "error";
                    errorMessage.value = "Recording is too large. Please keep it shorter.";
                    return;
                }

                recordedBlob.value = audioBlob;
                recordingUrl.value = URL.createObjectURL(audioBlob);
            } catch (e) {
                console.error("[echo-lab-upload-test] failed to prepare recording", e);
                aiState.value = "error";
                errorMessage.value = "Failed to prepare recording.";
            } finally {
                mediaRecorder.value = null;
                stopTracks();
            }
        };

        mediaRecorder.value.start();
        recording.value = true;
        recordingTime.value = 0;

        timer = setInterval(() => {
            recordingTime.value += 1;

            if (recordingTime.value >= MAX_RECORDING_SECONDS) {
                stopRecording();
            }
        }, 1000);
    } catch (e) {
        console.error("[echo-lab-upload-test] failed to start recording", e);
        aiState.value = "error";
        errorMessage.value = "Failed to start recording.";
        recording.value = false;
        clearRecordingTimer();
        stopTracks();
    }
}

function stopRecording() {
    if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return;

    recording.value = false;
    clearRecordingTimer();
    mediaRecorder.value.stop();
}

function cancelRecording() {
    if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return;

    cancelRequested.value = true;
    recording.value = false;
    clearRecordingTimer();
    mediaRecorder.value.stop();
}

function recordAgain() {
    resetRecording();
}

async function submitRecording() {
    if (!recordedBlob.value || !practiceTarget.value) {
        aiState.value = "error";
        errorMessage.value = "Record something before submitting.";
        return;
    }

    try {
        loading.value = true;
        resetDebug();

        const { getAccessToken } = await useAuth();
        const token = await getAccessToken();

        /**
         * Step 1:
         * Create the async attempt row.
         */
        const attempt = await $fetch<CreateEchoLabAttemptResponse>(
            "/api/echo-lab/attempts",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: {
                    wordId: wordSlug.value,
                    exampleIndex: idx.value,
                    scope: "level",
                    slug: levelSlug.value,
                },
            },
        );

        attemptDebug.value = attempt;

        /**
         * Step 2:
         * Upload directly to R2.
         *
         * The upload Content-Type should match whatever the backend used when
         * generating the presigned URL.
         */
        const uploadBlob =
            recordedBlob.value.type === attempt.uploadContentType
                ? recordedBlob.value
                : recordedBlob.value.slice(
                    0,
                    recordedBlob.value.size,
                    attempt.uploadContentType,
                );

        const uploadResponse = await fetch(attempt.uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Type": attempt.uploadContentType,
            },
            body: uploadBlob,
        });

        uploadDebug.value = {
            ok: uploadResponse.ok,
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
        };

        if (!uploadResponse.ok) {
            throw new Error(
                `R2 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
            );
        }

        const completedUpload = await $fetch<CompleteUploadResponse>(
            `/api/echo-lab/attempts/${attempt.attemptId}/complete-upload`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        completedUploadDebug.value = completedUpload;

        console.log("[echo-lab-upload-test] completed upload", completedUpload);

        const queuedAttempt = await $fetch<QueueAttemptResponse>(
            `/api/echo-lab/attempts/${attempt.attemptId}/queue`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        queuedAttemptDebug.value = queuedAttempt;

        const processedAttempt = await $fetch<{
            attemptId: string;
            status: string;
            transcript: string;
            score: number;
            matchType: string;
            confidence: number;
            feedback: unknown;
        }>(
            `/api/echo-lab/attempts/${attempt.attemptId}/process`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        console.log("[echo-lab-upload-test] processed attempt", processedAttempt);

        console.log("[echo-lab-upload-test] queued attempt", queuedAttempt);

        const attemptStatus = await $fetch<AttemptStatusResponse>(
            `/api/echo-lab/attempts/${attempt.attemptId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        attemptStatusDebug.value = attemptStatus;

        console.log("[echo-lab-upload-test] attempt status", attemptStatus);

        aiState.value = "success";

    } catch (e) {
        console.error("[echo-lab-upload-test] async upload failed", e);
        aiState.value = "error";
        errorMessage.value =
            e instanceof Error ? e.message : "Async upload test failed.";
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    supported.value = !!(navigator.mediaDevices && window.MediaRecorder);
});

onUnmounted(() => {
    resetRecording();
});
</script>

<template>
    <main class="min-h-[70vh] p-6">
        <div class="mx-auto max-w-2xl space-y-6">
            <header class="space-y-2 text-center">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Dev test
                </p>

                <h1 class="text-2xl font-bold text-gray-900">
                    Echo Lab async upload test
                </h1>

                <p class="text-sm text-gray-500">
                    This page only tests attempt creation and direct R2 upload. It does not
                    process pronunciation yet.
                </p>
            </header>

            <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Failed to load word data.
            </div>

            <section v-if="practiceTarget"
                class="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm space-y-3">
                <div class="flex justify-end">
                    <DojoAudioSettings v-model:voice="selectedAudioVoice" v-model:playback-rate="playbackRate" />
                </div>

                <div class="space-y-2">
                    <p class="text-4xl font-bold text-gray-900">
                        {{ practiceTarget.chinese }}
                    </p>

                    <p class="text-sm text-gray-500">
                        {{ practiceTarget.jyutping }}
                    </p>

                    <p class="text-sm text-gray-500">
                        {{ practiceTarget.meaning }}
                    </p>
                </div>

                <div v-if="phraseAudioSrc" class="flex justify-center pt-2">
                    <AudioButton :src="phraseAudioSrc" :playback-rate="playbackRate" size="lg" />
                </div>
            </section>

            <section v-if="supported" class="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
                <div class="flex flex-col items-center gap-5">
                    <button v-if="!recording && !recordingUrl" type="button" :disabled="loading || !practiceTarget"
                        class="inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        @click="startRecording">
                        <Mic class="h-4 w-4 text-[#7ec6f3]" aria-hidden="true" />
                        Start recording
                    </button>

                    <div v-if="recording" class="w-full max-w-xs space-y-4 text-center">
                        <p class="text-sm font-medium text-red-500">
                            Recording... {{ recordingTime }} / {{ MAX_RECORDING_SECONDS }}s
                        </p>

                        <div class="h-2 overflow-hidden rounded-full bg-gray-200">
                            <div class="h-2 bg-red-500 transition-all duration-200 ease-out"
                                :style="{ width: progress + '%' }" />
                        </div>

                        <div class="flex justify-center gap-3">
                            <button type="button" :disabled="loading"
                                class="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                @click="stopRecording">
                                <Square class="h-4 w-4 fill-current" aria-hidden="true" />
                                Stop
                            </button>

                            <button type="button" :disabled="loading"
                                class="inline-flex items-center gap-2 rounded-2xl bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                                @click="cancelRecording">
                                <XCircle class="h-4 w-4" aria-hidden="true" />
                                Cancel
                            </button>
                        </div>
                    </div>

                    <div v-if="recordingUrl"
                        class="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                        <p class="text-sm font-medium text-gray-600">
                            Your recording
                        </p>

                        <audio ref="recordingAudio" :src="recordingUrl" controls class="w-full" />

                        <div class="flex flex-wrap justify-center gap-3">
                            <button type="button" :disabled="loading"
                                class="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50"
                                @click="replayRecording">
                                <Play class="h-4 w-4" aria-hidden="true" />
                                Replay
                            </button>

                            <button type="button" :disabled="loading"
                                class="inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                                @click="recordAgain">
                                <RotateCcw class="h-4 w-4" aria-hidden="true" />
                                Record again
                            </button>

                            <button type="button" :disabled="loading"
                                class="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                @click="submitRecording">
                                <Send class="h-4 w-4 text-[#7ec6f3]" aria-hidden="true" />
                                <!-- Upload to R2 -->
                                Submit test upload
                            </button>
                        </div>
                    </div>

                    <p v-if="loading" class="flex items-center gap-2 text-sm text-gray-500">
                        <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                        Creating attempt and uploading...
                    </p>

                    <div v-if="aiState === 'success'"
                        class="w-full max-w-md rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        Upload completed. The attempt should now be marked as uploaded.
                    </div>

                    <div v-if="aiState === 'error'"
                        class="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <p class="font-semibold">Upload test failed</p>
                        <p v-if="errorMessage" class="mt-1">{{ errorMessage }}</p>
                    </div>
                </div>
            </section>

            <section v-else class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Your browser does not support microphone recording.
            </section>

            <section
                v-if="attemptDebug || uploadDebug || completedUploadDebug || queuedAttemptDebug || attemptStatusDebug"
                class="rounded-2xl border border-gray-200 bg-white p-5 text-left text-xs text-gray-700 shadow-sm space-y-4">
                <h2 class="text-sm font-semibold text-gray-900">
                    Debug output
                </h2>

                <div v-if="attemptDebug" class="space-y-1">
                    <p>
                        <strong>Attempt ID:</strong>
                        {{ attemptDebug.attemptId }}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        {{ attemptDebug.status }}
                    </p>

                    <p>
                        <strong>Word ID:</strong>
                        {{ attemptDebug.wordId }}
                    </p>

                    <p>
                        <strong>Example index:</strong>
                        {{ attemptDebug.exampleIndex }}
                    </p>

                    <p>
                        <strong>R2 object key:</strong>
                        {{ attemptDebug.audioObjectKey }}
                    </p>

                    <p>
                        <strong>Upload content type:</strong>
                        {{ attemptDebug.uploadContentType }}
                    </p>
                </div>

                <div v-if="uploadDebug" class="space-y-1">
                    <p>
                        <strong>Upload OK:</strong>
                        {{ uploadDebug.ok }}
                    </p>

                    <p>
                        <strong>Upload status:</strong>
                        {{ uploadDebug.status }} {{ uploadDebug.statusText }}
                    </p>
                </div>

                <div v-if="completedUploadDebug" class="space-y-1">
                    <p>
                        <strong>Completed upload status:</strong>
                        {{ completedUploadDebug.status }}
                    </p>

                    <p>
                        <strong>Completed attempt ID:</strong>
                        {{ completedUploadDebug.attemptId }}
                    </p>
                </div>

                <div v-if="queuedAttemptDebug" class="space-y-1">
                    <p>
                        <strong>Queued attempt status:</strong>
                        {{ queuedAttemptDebug.status }}
                    </p>

                    <p>
                        <strong>Queued at:</strong>
                        {{ queuedAttemptDebug.queuedAt ?? "null" }}
                    </p>
                </div>

                <div v-if="attemptStatusDebug" class="space-y-1">
                    <p>
                        <strong>Fetched attempt status:</strong>
                        {{ attemptStatusDebug.status }}
                    </p>

                    <p>
                        <strong>Transcript:</strong>
                        {{ attemptStatusDebug.transcript ?? "null" }}
                    </p>

                    <p>
                        <strong>Score:</strong>
                        {{ attemptStatusDebug.score ?? "null" }}
                    </p>
                </div>
            </section>

            <section class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                <h2 class="mb-2 font-semibold text-gray-800">
                    Expected result
                </h2>

                <ol class="list-decimal space-y-1 pl-5">
                    <li>A row is created in <code>echo_lab_attempts</code>.</li>
                    <li>The row starts with <code>status = created</code>.</li>
                    <li>The browser uploads the recording directly to R2.</li>
                    <li>An object appears at the displayed R2 object key.</li>
                </ol>

                <p class="mt-3">
                    This page now calls the complete-upload endpoint, so the final row status
                    should become <code>uploaded</code>.
                </p>
            </section>
        </div>
    </main>
</template>