# App Next Steps (Product + Engineering)

## 1) Stabilize the daily quiz experience (highest impact)

- Add a small API contract test suite for daily vocab endpoints (`session`, `finalize`, `reload`) and worker finalization behavior.
- Add structured logs + alerting for:
  - queue publish failures
  - worker processing failures
  - long-running `processing` sessions (poll timeout).
- Add a user-facing fallback when background processing stays in `processing` for too long (e.g., "We’re still finalizing your XP. Refresh in a few seconds.").

### Success metric
- < 0.5% daily finalize failures.
- < 2% sessions stuck in `processing` beyond 20s.

## 2) Improve performance and scalability

- Revisit page caching strategy for public pages (avoid global `no-cache` where not needed).
- Re-enable/benchmark CSS code splitting and measure impact on first render.
- Add endpoint-level p95/p99 latency dashboards for hottest APIs (daily/session/finalize/reload, quiz finalize routes).
- Load test queue→worker throughput at realistic peak levels and tune DB pool + QStash flow controls accordingly.

### Success metric
- p95 API latency under 300ms for read endpoints.
- p95 finalize response under 700ms (excluding async worker completion).

## 3) Strengthen quality guardrails

- Fix/refresh failing tests and make CI block merges on:
  - `npm test`
  - `npm run build`
- Add one integration test for the daily flow:
  1. start/load session
  2. submit answers
  3. poll reload until complete
  4. verify expected XP/stat updates.

### Success metric
- Green CI on every PR.
- 0 regressions in daily flow route names/contracts.

## 4) Product growth ideas (quick wins)

- Add a post-quiz streak card with next action CTA (e.g., "Do one topic quiz now").
- Add a weekly goal and "days active" mini-chart in the completion screen.
- Add lightweight reminders/notifications for unfinished daily session.
- A/B test completion copy and button labels to improve return-to-practice rate.

### Success metric
- +10–15% weekly retention for active learners.
- +8% increase in next-session starts from daily completion screen.

## 5) Suggested execution plan (2 weeks)

### Week 1
- Daily-flow reliability work (tests + observability + fallback states).
- CI quality gate + test cleanup.

### Week 2
- Caching/CSS performance experiments.
- Dashboarding + first load test.
- One growth experiment on completion CTA.

---

If helpful, the immediate next task should be:
**"Implement daily-flow API contract tests + worker processing observability"**
because it lowers user-visible failures while also giving better scaling confidence.
