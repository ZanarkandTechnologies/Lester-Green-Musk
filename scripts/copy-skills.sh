#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/copy-skills.sh
  scripts/copy-skills.sh [--dest PATH] <skill> [<skill> ...]
  scripts/copy-skills.sh --all
  scripts/copy-skills.sh --list

Edit DEFAULT_SKILLS below, then run the script with no arguments to copy those
skills from ./skills into ./.agents/skills so Codex can load them.
Existing destination copies are removed first, so each run fully overwrites the
equipped skill with the current repo version.
Default no-arg runs also delete equipped skills that are not listed in
DEFAULT_SKILLS.
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
source_dir="${repo_root}/skills"
dest_dir="${repo_root}/.agents/skills"

# Edit this list when you want to equip a new set of local skills into .agents/skills.
DEFAULT_SKILLS=(
  "notion-context"
  "morning-report"
  "augment-boss-propose"
  "augment-boss-execute"
)

available_skills() {
  find "${source_dir}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
}

print_available_skills() {
  printf 'Available skills:\n'
  available_skills | sed 's/^/  - /'
}

list_only=0
copy_all=0
using_default_skills=0
declare -a selected_skills=()

while (($# > 0)); do
  case "$1" in
    --all)
      copy_all=1
      ;;
    --list)
      list_only=1
      ;;
    --dest)
      shift
      (($# > 0)) || die "--dest requires a path"
      if [[ "$1" = /* ]]; then
        dest_dir="$1"
      else
        dest_dir="${repo_root}/$1"
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "unknown option: $1"
      ;;
    *)
      selected_skills+=("$1")
      ;;
  esac
  shift
done

if ((list_only == 1)); then
  print_available_skills
  exit 0
fi

if ((copy_all == 1)); then
  mapfile -t selected_skills < <(available_skills)
fi

if ((${#selected_skills[@]} == 0)); then
  selected_skills=("${DEFAULT_SKILLS[@]}")
  using_default_skills=1
fi

declare -a missing_skills=()
for skill_name in "${selected_skills[@]}"; do
  if [[ ! -d "${source_dir}/${skill_name}" ]]; then
    missing_skills+=("${skill_name}")
  fi
done

if ((${#missing_skills[@]} > 0)); then
  printf 'Missing skills:\n' >&2
  printf '  - %s\n' "${missing_skills[@]}" >&2
  printf '\n' >&2
  print_available_skills >&2
  exit 1
fi

mkdir -p "${dest_dir}"

if ((using_default_skills == 1)); then
  while IFS= read -r existing_path; do
    [[ -n "${existing_path}" ]] || continue
    existing_name="$(basename "${existing_path}")"
    keep_existing=0

    for skill_name in "${selected_skills[@]}"; do
      if [[ "${existing_name}" == "${skill_name}" ]]; then
        keep_existing=1
        break
      fi
    done

    if ((keep_existing == 0)); then
      printf 'Removing unequipped %s\n' "${existing_path}"
      rm -rf "${existing_path}"
    fi
  done < <(find "${dest_dir}" -mindepth 1 -maxdepth 1)
fi

copied_count=0
for skill_name in "${selected_skills[@]}"; do
  target_dir="${dest_dir}/${skill_name}"
  if [[ -e "${target_dir}" ]]; then
    printf 'Overwriting %s\n' "${target_dir}"
    rm -rf "${target_dir}"
  fi
  cp -R "${source_dir}/${skill_name}" "${target_dir}"
  printf 'Copied %s -> %s\n' "${skill_name}" "${target_dir}"
  copied_count=$((copied_count + 1))
done

printf 'Done. Copied %d skill(s) into %s\n' "${copied_count}" "${dest_dir}"
