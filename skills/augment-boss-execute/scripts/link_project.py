#!/usr/bin/env python3
"""
Link a Notion task to a project.
Usage: python link_project.py TASK_ID PROJECT_ID
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


def link_task_to_project(task_id, project_id):
    """Link a task to a project via the Project relation field."""
    payload = {"properties": {"Project": {"relation": [{"id": project_id}]}}}
    response = requests.patch(
        f"https://api.notion.com/v1/pages/{task_id}",
        headers={
            "Authorization": f"Bearer {NOTION_KEY}",
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
        },
        json=payload,
    )
    if response.status_code == 200:
        print(f"✅ Linked task {task_id} -> project {project_id}")
        return True
    print(f"❌ Error: {response.status_code}")
    print(response.text)
    return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python link_project.py TASK_ID PROJECT_ID")
        sys.exit(1)
    task_id = sys.argv[1]
    project_id = sys.argv[2]
    link_task_to_project(task_id, project_id)
