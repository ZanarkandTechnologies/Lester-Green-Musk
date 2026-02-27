---
name: augment-boss-execute
version: 1.0.0
description: "Execution-phase skill for augment-boss. Execute only approved Review proposals, append execution updates, and return ticket status to Review."
allowed-tools: Read, Glob, Grep
---

# Augment Boss Execute

Execution-only phase for approved Notion proposals. This skill performs approved actions and updates the existing proposal thread; it does not create new proposals.

## Trigger Conditions

- User explicitly approves (`yes`, `go ahead`) a proposal.
- A target proposal ticket is in approved execution state.
- The proposal already exists in Notion Review thread context.

## Workflow (First-Load Contract)

1. Load approved proposal ticket and verify approval signal.
2. Gather current context (task content, project links, related tickets).
3. Build an execution checklist from approved scope.
4. Execute approved actions only (link/merge/archive/update as approved).
5. Append `Update (timestamp)` section to the same ticket.
6. Return ticket status to `Review` unless explicitly asked to mark done.
7. Send execution completion notification if needed.
8. Stop and wait for next instruction.

## Core Decision Branches

- **Approved** -> execute within approved scope.
- **Not approved / ambiguous** -> stop and request approval confirmation.

## Top 3 Gotchas

1. Never create proposal tickets in execute phase.
2. Never expand scope beyond what was approved.
3. Never leave lifecycle state dangling; append update and return to `Review`.

## Outcome Contract

- Approved work is executed and documented in the same Notion ticket.
- Ticket has a new `Update (timestamp)` section with what changed and results.
- Ticket lifecycle returns to `Review` by default.

## Execution Checklist Template

```markdown
# Update (timestamp)

## What I Did
- [Executed action with IDs]
- [Executed action with IDs]

## Result
- [State change summary]

## Follow-up Needed
- [Only if required]
```

## Script Entrypoints

- `scripts/append_update.py`
- `scripts/link_project.py`
- `scripts/execute_gate.py`

## Prompt Entry

- [prompts/execute.md](prompts/execute.md)
