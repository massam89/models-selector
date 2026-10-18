#!/usr/bin/env bash

spec_error() {
  printf 'ERROR: %s\n' "$*" >&2
}

lowercase() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

require_node() {
  if ! command -v node >/dev/null 2>&1; then
    spec_error "Node.js is required to read and write Spec Kit JSON files"
    return 1
  fi
}

find_specify_root() {
  local current
  current="$(cd -- "${1:-$PWD}" 2>/dev/null && pwd -P)" || return 1
  while :; do
    if [[ -d "$current/.specify" ]]; then
      printf '%s\n' "$current"
      return 0
    fi
    [[ "$current" == "/" ]] && break
    current="$(dirname -- "$current")"
  done
  return 1
}

resolve_specify_init_dir() {
  local init_dir="$SPECIFY_INIT_DIR"
  if [[ "$init_dir" != /* ]]; then
    init_dir="$PWD/$init_dir"
  fi
  if [[ ! -d "$init_dir" ]]; then
    spec_error "SPECIFY_INIT_DIR does not point to an existing directory: $SPECIFY_INIT_DIR"
    return 1
  fi
  init_dir="$(cd -- "$init_dir" && pwd -P)" || return 1
  if [[ ! -d "$init_dir/.specify" ]]; then
    spec_error "SPECIFY_INIT_DIR is not a Spec Kit project (no .specify/ directory): $init_dir"
    return 1
  fi
  printf '%s\n' "$init_dir"
}

get_repo_root() {
  local script_dir
  if [[ -n "${SPECIFY_INIT_DIR:-}" ]]; then
    resolve_specify_init_dir
    return
  fi
  if find_specify_root "$PWD"; then
    return 0
  fi
  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" || return 1
  (cd -- "$script_dir/../../.." && pwd -P)
}

save_feature_json() {
  local repo_root="$1"
  local feature_directory="$2"
  local relative="$feature_directory"
  local json_path="$repo_root/.specify/feature.json"

  if [[ "$relative" == "$repo_root/"* ]]; then
    relative="${relative#"$repo_root/"}"
  fi
  require_node || return 1
  mkdir -p -- "$repo_root/.specify"
  node - "$json_path" "$relative" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const value = process.argv[3];
const content = `${JSON.stringify({ feature_directory: value })}\n`;
const temp = `${path}.${process.pid}.tmp`;
fs.writeFileSync(temp, content, { encoding: 'utf8' });
fs.renameSync(temp, path);
NODE
}

get_feature_paths() {
  require_node || return 1
  REPO_ROOT="$(get_repo_root)" || return 1
  CURRENT_BRANCH="${SPECIFY_FEATURE:-}"

  if [[ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]]; then
    FEATURE_DIR="$SPECIFY_FEATURE_DIRECTORY"
    [[ "$FEATURE_DIR" == /* ]] || FEATURE_DIR="$REPO_ROOT/$FEATURE_DIR"
    if [[ "${SPECIFY_NO_PERSIST:-0}" != "1" ]]; then
      save_feature_json "$REPO_ROOT" "$SPECIFY_FEATURE_DIRECTORY" || return 1
    fi
  elif [[ -f "$REPO_ROOT/.specify/feature.json" ]]; then
    FEATURE_DIR="$(node - "$REPO_ROOT/.specify/feature.json" <<'NODE'
const fs = require('node:fs');
try {
  const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (typeof data.feature_directory === 'string' && data.feature_directory.length) {
    process.stdout.write(data.feature_directory);
  }
} catch {}
NODE
    )"
    if [[ -z "$FEATURE_DIR" ]]; then
      spec_error "Feature directory not found. Set SPECIFY_FEATURE_DIRECTORY or ensure .specify/feature.json contains feature_directory."
      return 1
    fi
    [[ "$FEATURE_DIR" == /* ]] || FEATURE_DIR="$REPO_ROOT/$FEATURE_DIR"
  else
    spec_error "Feature directory not found. Set SPECIFY_FEATURE_DIRECTORY or run the specify command to create .specify/feature.json."
    return 1
  fi

  if [[ -z "$CURRENT_BRANCH" ]]; then
    CURRENT_BRANCH="$(basename -- "${FEATURE_DIR%/}")"
  fi
  FEATURE_SPEC="$FEATURE_DIR/spec.md"
  IMPL_PLAN="$FEATURE_DIR/plan.md"
  TASKS="$FEATURE_DIR/tasks.md"
  RESEARCH="$FEATURE_DIR/research.md"
  DATA_MODEL="$FEATURE_DIR/data-model.md"
  QUICKSTART="$FEATURE_DIR/quickstart.md"
  CONTRACTS_DIR="$FEATURE_DIR/contracts"
}

resolve_template() {
  local template_name="$1"
  local repo_root="$2"
  local base="$repo_root/.specify/templates"
  local candidate presets_dir registry_file preset_ids preset_id ext_dir ext

  candidate="$base/overrides/$template_name.md"
  [[ -f "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }

  presets_dir="$repo_root/.specify/presets"
  if [[ -d "$presets_dir" ]]; then
    registry_file="$presets_dir/.registry"
    local registry_valid=false
    if [[ -f "$registry_file" ]]; then
      if preset_ids="$(node - "$registry_file" 2>/dev/null <<'NODE'
const fs = require('node:fs');
try {
  const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (!data || !data.presets || typeof data.presets !== 'object' || Array.isArray(data.presets)) {
    throw new Error('Invalid presets registry');
  }
  const entries = Object.entries(data.presets)
    .filter(([, value]) => value && typeof value === 'object' && value.enabled !== false);
  const priorities = entries.map(([, value]) => value.priority ?? 10);
  const allNumbers = priorities.every(value => typeof value === 'number');
  const allStrings = priorities.every(value => typeof value === 'string');
  if (!allNumbers && !allStrings) throw new Error('Unsortable preset priorities');
  entries.sort((a, b) => {
    const ap = a[1].priority ?? 10;
    const bp = b[1].priority ?? 10;
    return ap < bp ? -1 : ap > bp ? 1 : a[0].localeCompare(b[0]);
  });
  for (const [id] of entries) console.log(id);
} catch {
  process.exit(1);
}
NODE
      )"; then
        registry_valid=true
      else
        preset_ids=""
      fi
      if [[ -n "$preset_ids" ]]; then
        while IFS= read -r preset_id; do
          candidate="$presets_dir/$preset_id/templates/$template_name.md"
          [[ -f "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
        done <<< "$preset_ids"
      fi
    fi
    if [[ "$registry_valid" != true ]]; then
      local preset_dir
      for preset_dir in "$presets_dir"/*; do
        [[ -d "$preset_dir" ]] || continue
        preset_id="${preset_dir##*/}"
        candidate="$presets_dir/$preset_id/templates/$template_name.md"
        [[ -f "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
      done
    fi
  fi

  ext_dir="$repo_root/.specify/extensions"
  if [[ -d "$ext_dir" ]]; then
    for ext in "$ext_dir"/*; do
      [[ -d "$ext" ]] || continue
      ext="${ext##*/}"
      candidate="$ext_dir/$ext/templates/$template_name.md"
      [[ -f "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
    done
  fi

  candidate="$base/$template_name.md"
  [[ -f "$candidate" ]] && { printf '%s\n' "$candidate"; return 0; }
  return 1
}

json_object() {
  require_node || return 1
  node - "$@" <<'NODE'
const entries = process.argv.slice(2).map(entry => {
  const index = entry.indexOf('=');
  return [entry.slice(0, index), entry.slice(index + 1)];
});
const result = Object.fromEntries(entries.map(([key, value]) => [
  key,
  value === 'true' ? true : value === 'false' ? false : value
]));
process.stdout.write(`${JSON.stringify(result)}\n`);
NODE
}

check_file() {
  if [[ -f "$1" ]]; then
    printf '  [OK] %s\n' "$2"
  else
    printf '  [FAIL] %s\n' "$2"
  fi
}

check_dir_has_files() {
  if [[ -d "$1" ]] && find "$1" -mindepth 1 -print -quit | grep -q .; then
    printf '  [OK] %s\n' "$2"
  else
    printf '  [FAIL] %s\n' "$2"
  fi
}
