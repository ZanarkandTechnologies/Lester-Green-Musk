#!/usr/bin/env python3
"""
Append an update section to an existing Notion task.
Usage: python append_update.py TASK_ID "update.md"
"""

import os
import sys

import requests

NOTION_KEY = (
    os.environ.get("NOTION_KEY")
    or os.environ.get("NOTION_API_KEY")
    or os.environ.get("OPENCLAW_NOTION_API_KEY")
)
if not NOTION_KEY:
    raise RuntimeError("Missing Notion API key. Set NOTION_KEY or NOTION_API_KEY.")
NOTION_VERSION = "2022-06-28"


def read_update(filepath):
    """Read update from markdown file."""
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


def append_blocks(page_id, update_file):
    """Append blocks to existing Notion page."""
    update_content = read_update(update_file)
    blocks = build_rich_text(update_content)
    payload = {"children": blocks}

    response = requests.patch(
        f"https://api.notion.com/v1/blocks/{page_id}/children",
        headers={
            "Authorization": f"Bearer {NOTION_KEY}",
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
        },
        json=payload,
    )

    if response.status_code == 200:
        print(f"✅ Appended update to task: {page_id}")
        return True

    print(f"❌ Error: {response.status_code}")
    print(response.text)
    return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python append_update.py TASK_ID update.md")
        sys.exit(1)

    task_id = sys.argv[1]
    update_file = sys.argv[2]
    append_blocks(task_id, update_file)
