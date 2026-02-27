---
name: impl-plan
version: 1.0.0
description: "Generate implementation-ready plans from goals, projects, memory, history, and task context. Output includes mini-PRD context plus an actionable implementation plan."
allowed-tools: Read, Glob, Grep
---

# Impl Plan Skill

Use this skill when you need a high-quality plan for a task or slice before execution.

## Core Prompt Wording (Use Literally)

Start planning with this wording style:

0a. Study current context sources that exist (`@docs/prd.md`, `@docs/specs/*`, `@docs/progress.md`, `@docs/MEMORY.md`) when available.
0b. For non-coding tasks, study equivalent context from goals/projects/ticket history/memory.
0c. Search before assuming gaps.

## Trigger Conditions

- User asks for a plan, implementation plan, or next-step breakdown.
- A proposal/ticket exists and needs an execution-ready plan.
- Requirements are partially known and need structure before building.

## Workflow (First-Load Contract)

1. Gather context from goals, projects, memory, history, and current task/ticket.
2. Identify the smallest executable slice with highest impact.
3. Write mini-PRD context (goal, outcome, constraints, risks, success criteria).
4. Draft ordered implementation steps with touched interfaces/systems.
5. Add validation strategy and rollback/safety notes when needed.
6. Convert plan into execution todo list (one todo = one build loop where possible).
7. Run value question framework and job-done checks.
8. Run review gate for specificity and actionability.
9. Add final user happiness + wow gate todos.
10. Return yes/no approval handoff. Stop before implementation.

## Core Decision Branches

- **Context is sufficient** -> produce full implementation plan.
- **Context is incomplete/ambiguous** -> list assumptions and ask the minimum 1-2 critical clarifications.
- **Task is too large** -> split into phased slices and plan only the next slice.

## Top 3 Gotchas

1. Do not implement; this skill is planning-only.
2. Do not output generic advice without ordered actionable steps.
3. Do not skip constraints/risks; include them in mini-PRD context.

## Value Question Framework (Undersell + Overdeliver)

Before finalizing any plan, answer:

- What is the minimum promise we can make now?
- What can we deliver beyond that promise with low additional risk?
- What evidence proves the user’s job is actually done?
- What is the fastest path to reduce user effort or uncertainty?

## Job-Done Validation Questions

- If the user follows this plan, does their intended outcome become true?
- What failure mode could still leave them unsatisfied?
- Which verification step directly detects that failure mode?

## Outcome Contract

Each run outputs:

1. **Mini-PRD Context**
   - Goal
   - User/business outcome
   - Constraints
   - Risks
   - Success criteria
2. **Implementation Plan**
   - Scope for this slice
   - Ordered steps
   - Interfaces/files/systems touched
   - Validation checklist
   - Rollback/safety notes (if needed)
3. **Execution Todo List**
   - Discrete tasks ready for build loops
   - Must include required testing/verification todos
4. **Review/Test Criteria**
   - Correctness, completeness, usability, observability, risk control
5. **Final Wow Gate**
   - Will this make the user happy given their story?
   - What would make it better?
   - Can that improvement be implemented now to wow them?
6. **Approval Prompt**
   - Clear yes/no handoff

## Quality Review Gate

Before finalizing:

- Is the slice small enough to execute now?
- Are steps specific, ordered, and dependency-aware?
- Are validation checks explicit?
- Is the user decision reduced to yes/no?
- Do final todos include testing tasks?
- Did we include final wow gate items?

If any answer is no, refine before returning.

## Prompt Entry

- [prompts/plan.md](prompts/plan.md)

## References

- [references/template.md](references/template.md)
- [references/examples.md](references/examples.md)

## Relationship to PRD Skill

- `impl-plan` = default daily planning workflow.
- `prd` = full PRD authoring when deep requirement discovery is needed.
