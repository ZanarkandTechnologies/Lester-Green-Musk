# Impl Plan Prompt

Copy and paste this into a new session to start an implementation planning pass.

---

0a. Study current context sources that exist (`@docs/prd.md`, `@docs/specs/*`, `@docs/progress.md`, `@docs/MEMORY.md`) when available.
0b. For non-coding tasks, load equivalent context from goals/projects/ticket history/memory.
0c. Search before assuming gaps.

1. Planning mode only: produce a mini-PRD context plus an implementation plan for the next smallest executable slice.
2. Include ordered steps, touched systems/interfaces, validation checks, and rollback/safety notes if needed.
3. Run value-question framework and job-done checks before finalizing output.
4. Convert plan into execution todo list where one todo is one build/work loop when possible. Final todos must include testing/verification tasks.
5. Add general review/testing criteria (correctness, completeness, usability, observability, risk control).
6. Add final wow gate todos:
   - Will this make the user happy given their user story?
   - What would make it better?
   - Can I implement that improvement now to wow them?
7. End with clear yes/no handoff.

IMPORTANT: Do not implement. Plan only.
