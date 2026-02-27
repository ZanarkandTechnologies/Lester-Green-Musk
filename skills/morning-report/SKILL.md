---
name: morning-report
version: 2.0.0
description: "Single-owner orchestrator for morning messages. Composes context + embedded Daily Law provider + persona templates + profile routing."
allowed-tools: Read, Glob, rg, Shell
---

# Morning Report

Use this skill to generate and deliver a multi-message morning briefing.

## Trigger Conditions

- Daily scheduled report (default 8:00 AM Singapore).
- Manual prompts like “generate my morning report”.
- Recovery or refocus runs after low-momentum days.

## Orchestrator Dependencies

- Context orchestrator:
  - `../fetch-life-context/SKILL.md`
- Embedded provider (single-owner rule):
  - `references/providers/daily-law.md`
- Profiles:
  - `references/profiles/default.md`
  - `references/profiles/high-performance.md`
  - `references/profiles/recovery-mode.md`
- Message templates:
  - `references/templates/elon-priority.md`
  - `references/templates/robert-greene.md`
  - `references/templates/future-buff-you.md`
  - `references/templates/steve-jobs-vision.md`
  - `references/templates/future-us-logic.md`
  - `references/templates/reel-of-the-day.md`

## Workflow (First-Load Contract)

1. Load profile (`default` unless explicitly overridden).
2. Run `fetch-life-context` and collect focus projects, tasks, blockers, and momentum.
3. Load Daily Law via `references/providers/daily-law.md`.
4. Select enabled templates based on profile routing rules.
5. Render each template with gathered context.
6. Deliver messages in configured order to target channel.
7. Report success/degraded status with exact missing dependency names when relevant.

## Routing Rules

- Always include:
  - Elon priority message
  - Robert Greene message
- Include Future Buff You when movement/health nudge is enabled.
- Include Steve Jobs message when strategy/vision prompt is enabled.
- Include Future Us message when fear/paralysis framing is detected or requested.
- Include Reel of the Day when motivational media mode is enabled.

## Delivery

- Default channel: Telegram
- Default chat target: `6413825906`
- Default schedule: `0 8 * * *` (`Asia/Singapore`)
- Delivery should continue in degraded mode when one template/provider is unavailable.

## Environment Contract

Expected keys from `skills.entries.morning-report.env`:

- `MORNING_REPORT_PROFILE` (`default | high-performance | recovery-mode`)
- `MORNING_REPORT_TIMEZONE` (default: `Asia/Singapore`)
- `MORNING_REPORT_CRON` (default: `0 8 * * *`)
- `MORNING_REPORT_CHANNEL` (default: `telegram`)
- `MORNING_REPORT_CHAT_ID` (default: `6413825906`)
- `DAILY_LAW_BASE_URL`
- `DAILY_LAW_TODAY_PATH`
- `DAILY_LAW_DATE_PATH`

Context/provider credentials are sourced from `skills.entries.fetch-life-context.env`.

## Top 3 Gotchas

1. Do not keep long inline templates in this file.
2. Do not depend on standalone `daily-law` skill; use embedded provider reference.
3. Do not send partial outputs without explicit degraded status.

## Outcome Contract

- Morning report is assembled from profile + provider + template references.
- Missing provider/template/profile files are reported explicitly.
- Adding a new message type requires one template file and one routing entry.

## Example Execution

```text
1) Read profile: references/profiles/default.md
2) Run fetch-life-context
3) Read provider: references/providers/daily-law.md
4) Load enabled templates for selected profile
5) Render messages in profile-defined order
6) Send to Telegram target
7) Return structured run status
```
