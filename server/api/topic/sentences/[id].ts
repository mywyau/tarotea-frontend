import { readSentenceFeed } from "~/server/services/lessons/sentences";

export default defineEventHandler(event => readSentenceFeed(event, "topic-sentences"));
