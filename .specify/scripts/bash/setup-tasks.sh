#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

json=false
for arg in "$@"; do
  case "$(lowercase "$arg")" in
    -json|--json) json=true ;;
    -help|--help|-h)
      printf 'Usage: setup-tasks.sh [--json] [--help]\n'
      exit 0
      ;;
    *) spec_error "Unknown option '$arg'"; exit 1 ;;
  esac
done

get_feature_paths || exit 1
if [[ ! -f "$IMPL_PLAN" ]]; then
  spec_error "plan.md not found in $FEATURE_DIR"
  printf 'Run /speckit-plan first to create the implementation plan.\n' >&2
  exit 1
fi
if [[ ! -f "$FEATURE_SPEC" ]]; then
  spec_error "spec.md not found in $FEATURE_DIR"
  printf 'Run /speckit-specify first to create the feature structure.\n' >&2
  exit 1
fi

docs=()
[[ -f "$RESEARCH" ]] && docs+=("research.md")
[[ -f "$DATA_MODEL" ]] && docs+=("data-model.md")
if [[ -d "$CONTRACTS_DIR" ]] && find "$CONTRACTS_DIR" -mindepth 1 -print -quit | grep -q .; then
  docs+=("contracts/")
fi
[[ -f "$QUICKSTART" ]] && docs+=("quickstart.md")

tasks_template="$(resolve_template tasks-template "$REPO_ROOT" || true)"
if [[ -z "$tasks_template" || ! -f "$tasks_template" ]]; then
  spec_error "Could not resolve required tasks-template from the template override stack for $REPO_ROOT"
  printf "Template 'tasks-template' was not found in overrides, presets, extensions, or shared core.\n" >&2
  printf "Add .specify/templates/overrides/tasks-template.md or restore .specify/templates/tasks-template.md.\n" >&2
  exit 1
fi
tasks_template="$(cd -- "$(dirname -- "$tasks_template")" && pwd -P)/$(basename -- "$tasks_template")"

if [[ "$json" == true ]]; then
  require_node
  node - "$FEATURE_DIR" "$tasks_template" "${docs[@]}" <<'NODE'
const [featureDir, tasksTemplate, ...availableDocs] = process.argv.slice(2);
process.stdout.write(`${JSON.stringify({
  FEATURE_DIR: featureDir,
  AVAILABLE_DOCS: availableDocs,
  TASKS_TEMPLATE: tasksTemplate
})}\n`);
NODE
else
  printf 'FEATURE_DIR: %s\nTASKS_TEMPLATE: %s\nAVAILABLE_DOCS:\n' "$FEATURE_DIR" "$tasks_template"
  check_file "$RESEARCH" research.md
  check_file "$DATA_MODEL" data-model.md
  check_dir_has_files "$CONTRACTS_DIR" 'contracts/'
  check_file "$QUICKSTART" quickstart.md
fi
