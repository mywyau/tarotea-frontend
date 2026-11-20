# Learn English for Cantonese speakers

## Pilot

Give a Cantonese speaker one useful outcome from a short, free session. They should be able to recognise an everyday English phrase, hear how it sounds, and find it again after the quiz. Build the pilot inside Taro Tea with Traditional Chinese instructions written in natural Hong Kong Cantonese.

Start with **Survival Essentials**. Its English meanings and Cantonese examples give us source material for asking directions, getting help and explaining a problem. A suggested first release is 12 reviewed questions, with six per session. These are planning targets.

| What the learner sees | Example |
| --- | --- |
| Entry point | 學英文 → 日常應急英語 |
| Situation | 你想問洗手間喺邊，可以點講？ |
| English answer | Where’s the toilet? |
| Feedback | 答啱喇！如果想客氣啲，可以先講 “Excuse me”。 |
| Replay | 聽英文 |

“Where’s the bathroom?” also works here. Record it as an accepted alternative and exclude it from the wrong answers. The current topic already has separate entries for 廁所 and 洗手間, so selecting distractors by word ID alone would produce unfair questions.

## Build order

| Step | Deliverable | Ready to move on when |
| --- | --- | --- |
| **0. Review the pilot content** | Draft the prompts, English answers, accepted alternatives, distractors and short Cantonese explanations in `openai-tts`. Give each item a stable ID and keep its original word or example ID for reference. Agree on the English voice and spelling convention before recording. | A bilingual reviewer can answer each question and explain why exactly one visible choice fits. Start by reviewing the toilet, directions and help questions together. |
| **1. Ship a guest text quiz to preview** | Add a 學英文 entry and a free Survival Essentials route. Reuse the mobile quiz layout, answer feedback and completion screen. Fix the direction to Cantonese prompt → English choices for this course. | A signed-out learner can go from entry to results on mobile or desktop, retry missed questions, and finish without a login redirect. Existing Cantonese quizzes retain their current behaviour. |
| **2. Add English listening** | Generate audio for the approved English answers. Store clips under a distinct English prefix in R2 and map them to the pilot item IDs. Add tap-to-play after answering and in the results review. | A bilingual listener has checked every clip. An iPhone and an Android browser can replay the English for the current item. A failed audio request still lets the learner finish. |
| **3. Separate saved progress** | Give English practice its own course identifier in guest storage, signed-in progress, quiz selection and finalisation. Treat existing progress as Cantonese. Until that is ready, use session-only English results in preview. | The same account can practise the same underlying word in both courses with independent mastery. Retrying a completion request credits the English session once. Guests can still complete the free quiz. |
| **4. Release and decide whether to expand** | Publish the reviewed content and audio, check their public URLs, then enable the entry point. Track starts, completions, answer selections and playback failures by course. | Review the first cohort’s results alongside learner feedback. Investigate questions where many learners choose a defensible alternative. Expand once the content and playback issues found in the pilot are resolved. |

## Implementation notes

- **Quiz generation.** The active topic endpoint already builds both question directions and chooses one per question. Keep the current default for Cantonese practice and pass the English course choice explicitly. Use the reviewed choices for the pilot. [Topic quiz endpoint](../server/api/topic/quiz/v2/%5BtopicSlug%5D.ts)
- **Course and interface language.** A learner’s chosen course determines the answers, audio and progress. Cantonese instructions are a presentation choice. Keeping these separate lets the same account switch courses. Localise the pilot entry, controls, feedback, results and error states together.
- **Progress.** The current sentence quiz reads mastery by user and word ID. Trace the equivalent topic reads, guest state and XP writes before enabling rewards for English. Include the course in relevant cache keys and check existing-account behaviour on preview. [Current mastery lookup](../server/services/sentence-quiz/start/loadWordProgressMap.ts)
- **Operations.** Generate the small audio set offline and serve it from the CDN. Speaking assessment can stay paused. Use the preview deployment to test the exact content version intended for release. If the pilot needs to be withdrawn, hide its entry and disable its route together.

## Effort and next decision

With approved questions in hand, allow roughly **1–2 engineering days** for the guest text preview. Allow **several more days** for reviewed audio, saved progress and release checks. The progress estimate depends on which existing database and XP paths can carry a course identifier. Bilingual review and learner feedback need separate time.

The first approval is the **Step 0 question set**. After the pilot, use its results to choose between adding a second topic and adding English listening comprehension to the first. Typed answers can follow once accepted variants are covered.
