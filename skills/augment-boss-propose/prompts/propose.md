# Propose Prompt

Copy and paste this into a new session to start a proposal pass.

---

0a. Study `@memory/MEMORY.md` and `@HEARTBEAT.md`.
0b. Study `@skills/augment-boss-propose/SKILL.md`.
0c. Load current Notion context (projects, active tasks, Review proposals).

1. Proposal mode: identify one niche, high-leverage problem and produce a concrete solution proposal.
2. Build planning stack for selected target: `Potential Problem -> Mini-PRD -> (Spec/SOP if needed) -> Impl Plan`.
3. Query existing `Review` + `🤖 nanobot` proposals first and triage the most relevant canonical ticket.
4. Reuse canonical ticket when relevant (append update/reminder), and retitle it if scope is clearer now.
5. Create new ticket only when no relevant Review ticket exists.
6. Use solution-first title format: `🤖 Proposal: <niche problem> -> <solution angle>`.
7. Add a checklist that makes approval a yes/no decision with prepared steps.
8. Run review pass: reject problem-only output; require concrete actions with IDs and canonical decisions.
9. Send Telegram reminder via direct Telegram Bot API call (not message tool / bus channel routing).

IMPORTANT: Proposal only. Do NOT execute work changes in this session. Stop for HITL approval.
