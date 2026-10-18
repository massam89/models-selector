#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

json=false
allow_existing=false
dry_run=false
timestamp=false
short_name=""
number=""
number_set=false
description_parts=()

usage() {
  cat <<'EOF'
Usage: create-new-feature.sh [OPTIONS] <feature description>

Options:
  --json                    Output results in JSON format
  --dry-run                 Compute the feature name and paths without writing files
  --allow-existing-branch   Reuse the matching feature directory if it exists
  --short-name NAME         Provide a custom short name
  --number N                Prefer a sequential feature number
  --timestamp               Use a YYYYMMDD-HHMMSS prefix
  --help, -h                Show this help message
EOF
}

while (($#)); do
  case "$(lowercase "$1")" in
    -json|--json) json=true; shift ;;
    -dryrun|--dry-run) dry_run=true; shift ;;
    -allowexistingbranch|--allow-existing-branch) allow_existing=true; shift ;;
    -timestamp|--timestamp) timestamp=true; shift ;;
    -shortname|--short-name)
      (($# >= 2)) || { spec_error "Missing value for $1"; exit 1; }
      short_name="$2"
      shift 2
      ;;
    -number|--number)
      (($# >= 2)) || { spec_error "Missing value for $1"; exit 1; }
      number="$2"
      number_set=true
      shift 2
      ;;
    -help|--help|-h) usage; exit 0 ;;
    --) shift; description_parts+=("$@"); break ;;
    -*)
      spec_error "Unknown option '$1'"
      exit 1
      ;;
    *) description_parts+=("$1"); shift ;;
  esac
done

if ((${#description_parts[@]} == 0)); then
  spec_error "Usage: create-new-feature.sh [OPTIONS] <feature description>"
  exit 1
fi
feature_description="${description_parts[*]}"
if [[ -z "${feature_description//[[:space:]]/}" ]]; then
  spec_error "Feature description cannot be empty or contain only whitespace"
  exit 1
fi

clean_branch_name() {
  printf '%s' "$1" |
    tr '[:upper:]' '[:lower:]' |
    sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
}

if [[ -n "$short_name" ]]; then
  branch_suffix="$(clean_branch_name "$short_name")"
else
  branch_suffix="$(node - "$feature_description" <<'NODE'
const description = process.argv[2];
const stopWords = new Set([
  'i', 'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall',
  'this', 'that', 'these', 'those', 'my', 'your', 'our', 'their',
  'want', 'need', 'add', 'get', 'set'
]);
const words = description.match(/[A-Za-z0-9]+/g) || [];
const meaningful = words.filter(word => {
  const lower = word.toLowerCase();
  if (stopWords.has(lower)) return false;
  return lower.length >= 3 || (word.length < 3 && word === word.toUpperCase());
}).map(word => word.toLowerCase());
if (meaningful.length) {
  process.stdout.write(meaningful.slice(0, meaningful.length === 4 ? 4 : 3).join('-'));
} else {
  const fallback = description.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(0, 3);
  process.stdout.write(fallback.join('-'));
}
NODE
  )"
fi
if [[ -z "$branch_suffix" ]]; then
  spec_error "Could not derive a short feature name from the description"
  exit 1
fi

REPO_ROOT="$(get_repo_root)" || exit 1
specs_dir="$REPO_ROOT/specs"
if [[ "$dry_run" != true ]]; then
  mkdir -p -- "$specs_dir"
fi

highest_number() {
  node - "$specs_dir" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
let highest = 0n;
try {
  for (const entry of fs.readdirSync(process.argv[2], { withFileTypes: true })) {
    if (!entry.isDirectory() || /^\d{8}-\d{6}-/.test(entry.name)) continue;
    const match = entry.name.match(/^(\d{3,})-/);
    if (match) {
      const value = BigInt(match[1]);
      if (value > highest) highest = value;
    }
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
process.stdout.write(highest.toString());
NODE
}

increment_number() {
  node - "$1" <<'NODE'
const max = 9223372036854775807n;
const next = BigInt(process.argv[2]) + 1n;
if (next > max) {
  console.error(`Error: feature number must be between 0 and ${max}`);
  process.exit(1);
}
process.stdout.write(next.toString());
NODE
}

has_spec_prefix() {
  local feature_number="$1"
  [[ -d "$specs_dir" ]] || return 1
  find "$specs_dir" -mindepth 1 -maxdepth 1 -type d -name "$feature_number-*" -print -quit | grep -q .
}

if [[ "$timestamp" == true ]]; then
  if [[ "$number_set" == true ]]; then
    printf '[specify] Warning: --number is ignored when --timestamp is used\n' >&2
  fi
  feature_number="$(date '+%Y%m%d-%H%M%S')"
else
  if [[ "$number_set" == true ]]; then
    if [[ ! "$number" =~ ^[0-9]+$ ]]; then
      spec_error "Number must be an unsigned integer, got '$number'"
      exit 1
    fi
    normalized_number="$(node - "$number" <<'NODE'
const value = BigInt(process.argv[2]);
const max = 9223372036854775807n;
if (value > max) {
  console.error(`Error: feature number must be between 0 and ${max}, got '${process.argv[2]}'`);
  process.exit(1);
}
process.stdout.write(value.toString());
NODE
    )" || exit 1
  else
    normalized_number="$(highest_number)"
    normalized_number="$(increment_number "$normalized_number")" || exit 1
  fi
  feature_number="$(printf '%03d' "$((10#$normalized_number))")"
  if [[ "$number_set" == true && -d "$specs_dir" ]]; then
    requested_name="$feature_number-$branch_suffix"
    if [[ "$allow_existing" != true || ! -d "$specs_dir/$requested_name" ]]; then
      if has_spec_prefix "$feature_number"; then
        requested_number="$feature_number"
        normalized_number="$(highest_number)"
        while :; do
          normalized_number="$(increment_number "$normalized_number")" || exit 1
          feature_number="$(printf '%03d' "$((10#$normalized_number))")"
          has_spec_prefix "$feature_number" || break
        done
        printf '[specify] Warning: --number %s conflicts with an existing spec directory; using %s instead\n' \
          "$requested_number" "$feature_number" >&2
      fi
    fi
  fi
fi

max_branch_bytes=244
branch_name="$feature_number-$branch_suffix"
if ((${#branch_name} > max_branch_bytes)); then
  max_suffix_bytes=$((max_branch_bytes - ${#feature_number} - 1))
  original_branch_name="$branch_name"
  branch_suffix="${branch_suffix:0:max_suffix_bytes}"
  branch_suffix="${branch_suffix%-}"
  branch_name="$feature_number-$branch_suffix"
  printf '[specify] Warning: Branch name exceeded GitHub'\''s 244-byte limit\n' >&2
  printf '[specify] Original: %s (%s bytes)\n' "$original_branch_name" "${#original_branch_name}" >&2
  printf '[specify] Truncated to: %s (%s bytes)\n' "$branch_name" "${#branch_name}" >&2
fi

feature_dir="$specs_dir/$branch_name"
spec_file="$feature_dir/spec.md"
if [[ "$dry_run" != true ]]; then
  if [[ -d "$feature_dir" && "$allow_existing" != true ]]; then
    if [[ "$timestamp" == true ]]; then
      spec_error "Feature directory '$feature_dir' already exists. Rerun to get a new timestamp or use a different --short-name."
    else
      spec_error "Feature directory '$feature_dir' already exists. Use a different feature name or --number."
    fi
    exit 1
  fi
  mkdir -p -- "$feature_dir"
  if [[ ! -f "$spec_file" ]]; then
    template="$(resolve_template spec-template "$REPO_ROOT" || true)"
    if [[ -n "$template" && -f "$template" ]]; then
      cp -- "$template" "$spec_file"
    else
      printf 'Warning: Spec template not found; created empty spec file\n' >&2
      : > "$spec_file"
    fi
  fi
  save_feature_json "$REPO_ROOT" "$feature_dir"
  printf '# To persist: export SPECIFY_FEATURE=%q\n' "$branch_name" >&2
  printf '#            export SPECIFY_FEATURE_DIRECTORY=%q\n' "$feature_dir" >&2
fi

if [[ "$json" == true ]]; then
  if [[ "$dry_run" == true ]]; then
    json_object \
      "BRANCH_NAME=$branch_name" \
      "SPEC_FILE=$spec_file" \
      "FEATURE_NUM=$feature_number" \
      "DRY_RUN=true"
  else
    json_object \
      "BRANCH_NAME=$branch_name" \
      "SPEC_FILE=$spec_file" \
      "FEATURE_NUM=$feature_number"
  fi
else
  printf 'BRANCH_NAME: %s\nSPEC_FILE: %s\nFEATURE_NUM: %s\n' \
    "$branch_name" "$spec_file" "$feature_number"
  if [[ "$dry_run" != true ]]; then
    printf '# To persist in your shell: export SPECIFY_FEATURE=%q\n' "$branch_name"
    printf '#                           export SPECIFY_FEATURE_DIRECTORY=%q\n' "$feature_dir"
  fi
fi
