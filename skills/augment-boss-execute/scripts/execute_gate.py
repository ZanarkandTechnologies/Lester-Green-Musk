#!/usr/bin/env python3
"""Simple approval gate for execution-phase runs."""

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate approval gate before execute phase.")
    parser.add_argument("--approval", required=True, help="Expected values: yes, go-ahead, approved")
    parser.add_argument("--ticket-status", required=True, help="Current ticket status")
    args = parser.parse_args()

    approval = args.approval.strip().lower()
    status = args.ticket_status.strip().lower()
    approved = approval in {"yes", "go-ahead", "go ahead", "approved"}
    allowed_status = status in {"in progress", "review"}

    result = {
        "approved": approved,
        "allowed_status": allowed_status,
        "can_execute": approved and allowed_status,
    }
    print(json.dumps(result, indent=2))
    if result["can_execute"]:
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
