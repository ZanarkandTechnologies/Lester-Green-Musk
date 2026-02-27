#!/usr/bin/env python3
"""
Upsert a Notion proposal task:
- Reuse existing Review ticket if matched
- Otherwise create a new Review ticket
"""

import argparse
import json
import os
from datetime import UTC, datetime
from typing import Dict, Tuple

import requests
from create_proposal_task import create_task
from find_review_proposal import extract_title, find_matching_review, normalize_text, score_candidate
from append_update import append_blocks

NOTION_KEY = (
    os.environ.get("NOTION_KEY")
    or os.environ.get("NOTION_API_KEY")
    or os.environ.get("OPENCLAW_NOTION_API_KEY")
)
if not NOTION_KEY:
    raise RuntimeError("Missing Notion API key. Set NOTION_KEY or NOTION_API_KEY.")
NOTION_VERSION = "2022-06-28"
NOTION_API = "https://api.notion.com/v1"


def notion_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {NOTION_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def maybe_retitle(page_id: str, title: str) -> Tuple[bool, str]:
    payload = {
        "properties": {
            "Name": {
                "title": [{"type": "text", "text": {"content": title}}]
            }
        }
    }
    response = requests.patch(
        f"{NOTION_API}/pages/{page_id}",
        headers=notion_headers(),
        json=payload,
    )
    if response.status_code == 200:
        return True, "retitled"
    return False, f"retitle_failed:{response.status_code}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Upsert proposal ticket in Notion Review state.")
    parser.add_argument("--title", required=True)
    parser.add_argument("--proposal-file", required=True)
    parser.add_argument("--proposal-key", default=None)
    parser.add_argument("--signature", default=None)
    parser.add_argument("--page-size", type=int, default=50)
    parser.add_argument(
        "--dry-run-state",
        default=None,
        help="Optional JSON file to simulate upsert behavior without Notion writes.",
    )
    parser.add_argument(
        "--retitle-on-reuse",
        action="store_true",
        help="Retitle canonical ticket when reused and title drift is detected.",
    )
    args = parser.parse_args()

    if not os.path.exists(args.proposal_file):
        raise FileNotFoundError(f"Proposal file not found: {args.proposal_file}")

    with open(args.proposal_file, "r", encoding="utf-8") as f:
        proposal_content = f.read()

    if args.dry_run_state:
        if os.path.exists(args.dry_run_state):
            with open(args.dry_run_state, "r", encoding="utf-8") as f:
                state = json.load(f)
        else:
            state = {"tickets": {}}

        best_id = None
        best_score = 0.0
        for ticket_id, ticket in state["tickets"].items():
            score = score_candidate(
                args.title,
                proposal_content,
                ticket["title"],
                ticket.get("content", ""),
            )
            if score > best_score:
                best_score = score
                best_id = ticket_id

        retitled = False
        if best_id and best_score >= 0.05:
            task_id = best_id
            old_title = state["tickets"][task_id]["title"]
            state["tickets"][task_id]["updates"] += 1
            action = "reused"
            if args.retitle_on_reuse and normalize_text(old_title) != normalize_text(args.title) and best_score >= 0.06:
                state["tickets"][task_id]["title"] = args.title
                retitled = True
        else:
            task_id = f"dryrun-{len(state['tickets']) + 1}"
            state["tickets"][task_id] = {
                "title": args.title,
                "proposal_key": args.proposal_key,
                "signature": args.signature,
                "updates": 0,
                "content": proposal_content,
                "created_at": datetime.now(UTC).isoformat(),
            }
            action = "created"
            best_score = 0.0

        with open(args.dry_run_state, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

        print(
            json.dumps(
                {
                    "action": action,
                    "task_id": task_id,
                    "title": state["tickets"][task_id]["title"],
                    "score": round(best_score, 3),
                    "retitled": retitled,
                    "mode": "dry-run",
                },
                indent=2,
            )
        )
        return 0

    match, matched_by, score, should_retitle = find_matching_review(
        title=args.title,
        proposal_key=args.proposal_key,
        signature=args.signature,
        page_size=args.page_size,
        proposal_content=proposal_content,
    )

    if match:
        task_id = match["id"]
        ok = append_blocks(task_id, args.proposal_file)
        if not ok:
            raise RuntimeError("Failed to append update to existing proposal.")
        retitle_status = "not_requested"
        if args.retitle_on_reuse and should_retitle:
            _, retitle_status = maybe_retitle(task_id, args.title)
        result = {
            "action": "reused",
            "matched_by": matched_by,
            "score": round(score, 3),
            "task_id": task_id,
            "title": extract_title(match),
            "url": match.get("url"),
            "retitle_status": retitle_status,
        }
        print(json.dumps(result, indent=2))
        return 0

    create_data = create_task(
        args.title,
        args.proposal_file,
        proposal_key=args.proposal_key,
        signature=args.signature,
    )
    if not create_data:
        raise RuntimeError("Failed to create proposal task.")

    result = {
        "action": "created",
        "matched_by": "none",
        "task_id": create_data.get("id"),
        "title": args.title,
        "url": create_data.get("url"),
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
