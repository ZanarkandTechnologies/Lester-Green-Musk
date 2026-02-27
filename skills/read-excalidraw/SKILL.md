---
name: read-excalidraw
version: 1.0.0
description: "Excalidraw integration skill for visual activity/context extraction."
metadata:
  openclaw:
    emoji: "✏️"
    requires:
      bins: ["excali-fetch"]
      env: ["EXCALI_ROOM_URL"]
    os: ["linux", "darwin", "win32"]
allowed-tools: Read, Glob, rg, Shell
---

# Read Excalidraw

Use this skill to gather recent visual-thinking signals from configured rooms.

## Trigger Conditions

- `fetch-life-context` provider routing for Excalidraw.
- Any request to summarize recent diagrams/themes.

## Room Config Files

- `rooms/default.md`

## Workflow (First-Load Contract)

1. Load room configuration from `rooms/*.md`.
2. Resolve fetch window and room URL.
3. Verify `excali-fetch` availability before fetch.
4. Fetch recent activity and extract themes.
5. Return concise visual summary + `provider_status`.

## Output Contract

- `visual_themes`
- `linked_projects`
- `confidence`
- `provider_status`

## Gotchas

1. Room URL must be valid and reachable.
2. Keep fetch-window defaults in room files, not inlined ad hoc.
3. Degraded output must still return explicit failure cause.
