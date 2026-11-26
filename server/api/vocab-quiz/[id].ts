import { readPreviewIndex } from "~/server/services/lessons/preview";

export default defineEventHandler(event => readPreviewIndex(event, "vocab-quiz"));
