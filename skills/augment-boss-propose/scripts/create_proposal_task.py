#!/usr/bin/env python3
"""
Create a Notion task with rich text proposal.
Usage: python create_proposal_task.py "Task Name" "proposal.md"
"""

import argparse
import os
import sys
from datetime import datetime

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


def read_proposal(filepath):
    """Read proposal from markdown file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def build_rich_text(markdown_content):
    """Convert markdown to Notion rich text blocks."""
    blocks = []
    lines = markdown_content.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i]

        if line.startswith("# ") and not line.startswith("## "):
            blocks.append(
                {
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [{"type": "text", "text": {"content": line[2:]}}]
                    },
                }
            )
        elif line.startswith("## "):
            blocks.append(
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": line[3:]}}]
                    },
                }
            )
        elif line.startswith("### "):
            blocks.append(
                {
                    "object": "block",
                    "type": "heading_3",
                    "heading_3": {
                        "rich_text": [{"type": "text", "text": {"content": line[4:]}}]
                    },
                }
            )
        elif line.startswith("```"):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            blocks.append(
                {
                    "object": "block",
                    "type": "code",
                    "code": {
                        "rich_text": [{"type": "text", "text": {"content": "\n".join(code_lines)}}],
                        "language": "plain text",
                    },
                }
            )
        elif line.startswith("- ") or line.startswith("* "):
            blocks.append(
                {
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": line[2:]}}]
                    },
                }
            )
        elif line.strip() and line[0].isdigit() and ". " in line:
            content = line.split(". ", 1)[1] if ". " in line else line
            blocks.append(
                {
                    "object": "block",
                    "type": "numbered_list_item",
                    "numbered_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": content}}]
                    },
                }
            )
        elif not line.strip():
            pass
        else:
            blocks.append(
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": line}}]
                    },
                }
            )

        i += 1

    return blocks


def _metadata_block(proposal_key, signature):
    if not proposal_key and not signature:
        return []
    lines = []
    if proposal_key:
        lines.append(f"proposal_key:{proposal_key}")
    if signature:
        lines.append(f"proposal_signature:{signature}")
    return [
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": " | ".join(lines)}}]
            },
        }
    ]


def create_task(name, proposal_file, proposal_key=None, signature=None):
    """Create Notion task with rich text proposal."""
    proposal_content = read_proposal(proposal_file)
    blocks = _metadata_block(proposal_key, signature) + build_rich_text(proposal_content)

    today = datetime.now().strftime("%Y-%m-%d")

    payload = {
        "parent": {"database_id": TASKS_DB},
        "properties": {
            "Name": {"title": [{"type": "text", "text": {"content": name}}]},
            "Status": {"status": {"name": "Review"}},
            "Tags": {"multi_select": [{"name": "🤖 nanobot"}]},
            "Act Time": {"date": {"start": today}},
        },
        "children": blocks,
    }

    response = requests.post(
        "https://api.notion.com/v1/pages",
        headers={
            "Authorization": f"Bearer {NOTION_KEY}",
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
        },
        json=payload,
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Created task: {data['url']}")
        print(f"task_id={data['id']}")
        return data

    print(f"❌ Error: {response.status_code}")
    print(response.text)
    return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a Notion proposal task.")
    parser.add_argument("task_name")
    parser.add_argument("proposal_file")
    parser.add_argument("--proposal-key", default=None)
    parser.add_argument("--signature", default=None)
    args = parser.parse_args()

    if not os.path.exists(args.proposal_file):
        print(f"❌ Proposal file not found: {args.proposal_file}")
        sys.exit(1)

    create_task(
        args.task_name,
        args.proposal_file,
        proposal_key=args.proposal_key,
        signature=args.signature,
    )
