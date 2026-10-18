#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

json=false
require_tasks=false
include_tasks=false
paths_only=false
for arg in "$@"; do
  case "$(lowercase "$arg")" in
    -json|--json) json=true ;;
    -requiretasks|--require-tasks) require_tasks=true ;;
    -includetasks|--include-tasks) include_tasks=true ;;
    -pathsonly|--paths-only) paths_only=true ;;
    -help|--help|-h) help=true ;;
    *) spec_error "Unknown option '$arg'"; exit 1 ;;
  esac
done

if [[ "${help:-false}" == true ]]; then
  cat <<'EOF'
Usage: check-prerequisites.sh [OPTIONS]

Options:
  --json               Output in JSON format
  --require-tasks      Require tasks.md to exist
  --include-tasks      Include tasks.md in AVAILABLE_DOCS
  --paths-only         Only output resolved paths
  --help, -h           Show this help message
EOF
  exit 0
fi

if [[ "$paths_only" == true ]]; then
  SPECIFY_NO_PERSIST=1 get_feature_paths
else
  get_feature_paths
fi

if [[ "$paths_only" == true ]]; then
  if [[ "$json" == true ]]; then
    json_object \
      "REPO_ROOT=$REPO_ROOT" \
      "BRANCH=$CURRENT_BRANCH" \
      "FEATURE_DIR=$FEATURE_DIR" \
      "FEATURE_SPEC=$FEATURE_SPEC" \
      "IMPL_PLAN=$IMPL_PLAN" \
      "TASKS=$TASKS"
  else
    printf 'REPO_ROOT: %s\nBRANCH: %s\nFEATURE_DIR: %s\nFEATURE_SPEC: %s\nIMPL_PLAN: %s\nTASKS: %s\n' \
      "$REPO_ROOT" "$CURRENT_BRANCH" "$FEATURE_DIR" "$FEATURE_SPEC" "$IMPL_PLAN" "$TASKS"
  fi
  exit 0
fi

if [[ ! -d "$FEATURE_DIR" ]]; then
  spec_error "Feature directory not found: $FEATURE_DIR"
  printf 'Run /speckit-specify first to create the feature structure.\n' >&2
  exit 1
fi
if [[ ! -f "$IMPL_PLAN" ]]; then
  spec_error "plan.md not found in $FEATURE_DIR"
  printf 'Run /speckit-plan first to create the implementation plan.\n' >&2
  exit 1
fi
if [[ "$require_tasks" == true && ! -f "$TASKS" ]]; then
  spec_error "tasks.md not found in $FEATURE_DIR"
  printf 'Run /speckit-tasks first to create the task list.\n' >&2
  exit 1
fi

docs=()
[[ -f "$RESEARCH" ]] && docs+=("research.md")
[[ -f "$DATA_MODEL" ]] && docs+=("data-model.md")
if [[ -d "$CONTRACTS_DIR" ]] && find "$CONTRACTS_DIR" -mindepth 1 -print -quit | grep -q .; then
  docs+=("contracts/")
fi
[[ -f "$QUICKSTART" ]] && docs+=("quickstart.md")
[[ "$include_tasks" == true && -f "$TASKS" ]] && docs+=("tasks.md")

if [[ "$json" == true ]]; then
  require_node
  node - "$FEATURE_DIR" "${docs[@]}" <<'NODE'
const [featureDir, ...availableDocs] = process.argv.slice(2);
process.stdout.write(`${JSON.stringify({ FEATURE_DIR: featureDir, AVAILABLE_DOCS: availableDocs })}\n`);
NODE
else
  printf 'FEATURE_DIR:%s\nAVAILABLE_DOCS:\n' "$FEATURE_DIR"
  check_file "$RESEARCH" research.md
  check_file "$DATA_MODEL" data-model.md
  check_dir_has_files "$CONTRACTS_DIR" 'contracts/'
  check_file "$QUICKSTART" quickstart.md
  [[ "$include_tasks" == true ]] && check_file "$TASKS" tasks.md
fi
