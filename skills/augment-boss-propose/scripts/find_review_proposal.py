#!/usr/bin/env python3
"""
Find an existing Review proposal ticket for dedupe.

Usage:
  python3 scripts/find_review_proposal.py --title "..." --proposal-file "/tmp/proposal.md"
"""

import argparse
import json
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

import requests

NOTION_KEY = (
    os.environ.get("NOTION_KEY")
    or os.environ.get("NOTION_API_KEY")
    or os.environ.get("OPENCLAW_NOTION_API_KEY")
)
if not NOTION_KEY:
    raise RuntimeError("Missing Notion API key. Set NOTION_KEY or NOTION_API_KEY.")
NOTION_VERSION = "2022-06-28"
TASKS_DB = "638d85a858b04d038d8b97be1a879a1f"
NOTION_API = "https://api.notion.com/v1"
STOPWORDS = {
    "proposal",
    "problem",
    "solution",
    "update",
    "result",
    "this",
    "that",
    "with",
    "and",
    "or",
    "the",
    "for",
    "from",
    "into",
    "are",
    "was",
    "were",
    "is",
    "in",
    "out",
    "off",
    "you",
    "your",
    "our",
    "their",
    "its",
    "only",
    "what",
    "why",
    "works",
    "review",
    "task",
    "ticket",
    "status",
    "timestamp",
    "feb",
    "am",
    "pm",
}


def normalize_text(value: str) -> str:
    text = re.sub(r"\s+", " ", value.strip().lower())
    return re.sub(r"[^a-z0-9|:_\- >]+", "", text)


def tokenize(value: str) -> Set[str]:
    normalized = normalize_text(value)
    tokens: List[str] = []
    for token in re.split(r"[^a-z0-9]+", normalized):
        if not token or token in STOPWORDS:
            continue
        if token.isdigit() or len(token) < 3:
            continue
        tokens.append(token)
    return set(tokens)


def jaccard_similarity(left: Set[str], right: Set[str]) -> float:
    if not left or not right:
        return 0.0
    union = left | right
    if not union:
        return 0.0
    return len(left & right) / len(union)


def notion_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {NOTION_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def extract_title(result: Dict[str, Any]) -> str:
    title_prop = result.get("properties", {}).get("Name", {}).get("title", [])
    return "".join(part.get("plain_text", "") for part in title_prop)


def get_blocks_text(page_id: str) -> str:
    response = requests.get(f"{NOTION_API}/blocks/{page_id}/children", headers=notion_headers())
    if response.status_code != 200:
        return ""
    data = response.json()
    lines: List[str] = []
    for block in data.get("results", []):
        block_type = block.get("type")
        payload = block.get(block_type, {}) if block_type else {}
        rich_text = payload.get("rich_text", [])
        line = "".join(rt.get("plain_text", "") for rt in rich_text)
        if line:
            lines.append(line)
    return "\n".join(lines)


def query_review_tasks(page_size: int = 50) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    start_cursor = None

    while True:
        payload: Dict[str, Any] = {
            "filter": {
                "and": [
                    {"property": "Status", "status": {"equals": "Review"}},
                    {"property": "Tags", "multi_select": {"contains": "🤖 nanobot"}},
                ]
            },
            "sorts": [{"timestamp": "last_edited_time", "direction": "descending"}],
            "page_size": page_size,
        }
        if start_cursor:
            payload["start_cursor"] = start_cursor

        response = requests.post(
            f"{NOTION_API}/databases/{TASKS_DB}/query",
            headers=notion_headers(),
            json=payload,
        )
        if response.status_code != 200:
            raise RuntimeError(f"Notion query failed: {response.status_code} {response.text}")

        data = response.json()
        batch = data.get("results", [])
        results.extend(batch)

        if not data.get("has_more"):
            break
        start_cursor = data.get("next_cursor")
        if not start_cursor:
            break

    return results


def _contains_marker(block_text: str, marker: str, value: str) -> bool:
    if not value:
        return False
    target = f"{marker}:{value}"
    return normalize_text(target) in normalize_text(block_text)


def score_candidate(
    proposal_title: str,
    proposal_content: str,
    candidate_title: str,
    candidate_content: str,
) -> float:
    proposed_title_tokens = tokenize(proposal_title)
    proposed_content_tokens = tokenize(proposal_content)
    candidate_title_tokens = tokenize(candidate_title)
    candidate_content_tokens = tokenize(candidate_content)

    title_score = jaccard_similarity(proposed_title_tokens, candidate_title_tokens)
    content_score = jaccard_similarity(proposed_content_tokens, candidate_content_tokens)
    return (0.65 * title_score) + (0.35 * content_score)


def find_matching_review(
    title: str,
    proposal_key: Optional[str],
    signature: Optional[str],
    page_size: int = 50,
    proposal_content: Optional[str] = None,
) -> Tuple[Optional[Dict[str, Any]], str, float, bool]:
    candidates = query_review_tasks(page_size=page_size)
    normalized_title = normalize_text(title)
    proposal_content = proposal_content or ""
    scored: List[Tuple[float, Dict[str, Any]]] = []

    if proposal_key:
        for item in candidates:
            block_text = get_blocks_text(item["id"])
            if _contains_marker(block_text, "proposal_key", proposal_key):
                should_retitle = normalize_text(extract_title(item)) != normalized_title
                return item, "proposal_key", 1.0, should_retitle

    for item in candidates:
        item_title = normalize_text(extract_title(item))
        if item_title and item_title == normalized_title:
            return item, "title", 0.95, False

    if signature:
        for item in candidates:
            block_text = get_blocks_text(item["id"])
            if _contains_marker(block_text, "proposal_signature", signature):
                should_retitle = normalize_text(extract_title(item)) != normalized_title
                return item, "signature", 0.9, should_retitle

    for item in candidates:
        score = score_candidate(
            title,
            proposal_content,
            extract_title(item),
            get_blocks_text(item["id"]),
        )
        scored.append((score, item))

    if not scored:
        return None, "none", 0.0, False

    scored.sort(key=lambda row: row[0], reverse=True)
    best_score, best_item = scored[0]
    if best_score < 0.05:
        return None, "none", best_score, False

    should_retitle = normalize_text(extract_title(best_item)) != normalized_title and best_score >= 0.06
    return best_item, "triage_similarity", best_score, should_retitle


def main() -> int:
    parser = argparse.ArgumentParser(description="Find matching Review proposal ticket.")
    parser.add_argument("--title", required=True)
    parser.add_argument("--proposal-file", default=None)
    parser.add_argument("--proposal-key", default=None)
    parser.add_argument("--signature", default=None)
    parser.add_argument("--page-size", type=int, default=50)
    args = parser.parse_args()

    proposal_content = ""
    if args.proposal_file:
        with open(args.proposal_file, "r", encoding="utf-8") as f:
            proposal_content = f.read()

    match, matched_by, score, should_retitle = find_matching_review(
        title=args.title,
        proposal_key=args.proposal_key,
        signature=args.signature,
        page_size=args.page_size,
        proposal_content=proposal_content,
    )

    output = {
        "matched": bool(match),
        "matched_by": matched_by,
        "score": round(score, 3),
        "should_retitle": should_retitle,
        "task_id": match.get("id") if match else None,
        "url": match.get("url") if match else None,
        "title": extract_title(match) if match else None,
    }
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
