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
      printf 'Usage: setup-plan.sh [--json] [--help]\n'
      exit 0
      ;;
    *) spec_error "Unknown option '$arg'"; exit 1 ;;
  esac
done

get_feature_paths || exit 1
mkdir -p -- "$FEATURE_DIR"
if [[ -f "$IMPL_PLAN" ]]; then
  if [[ "$json" == true ]]; then
    printf 'Plan already exists at %s, skipping template copy\n' "$IMPL_PLAN" >&2
  else
    printf 'Plan already exists at %s, skipping template copy\n' "$IMPL_PLAN"
  fi
else
  template="$(resolve_template plan-template "$REPO_ROOT" || true)"
  if [[ -n "$template" && -f "$template" ]]; then
    cp -- "$template" "$IMPL_PLAN"
    if [[ "$json" == true ]]; then
      printf 'Copied plan template to %s\n' "$IMPL_PLAN" >&2
    else
      printf 'Copied plan template to %s\n' "$IMPL_PLAN"
    fi
  else
    if [[ "$json" == true ]]; then
      printf 'Warning: Plan template not found\n' >&2
    else
      printf 'Warning: Plan template not found\n'
    fi
    : > "$IMPL_PLAN"
  fi
fi

if [[ "$json" == true ]]; then
  json_object \
    "FEATURE_SPEC=$FEATURE_SPEC" \
    "IMPL_PLAN=$IMPL_PLAN" \
    "SPECS_DIR=$FEATURE_DIR" \
    "BRANCH=$CURRENT_BRANCH"
else
  printf 'FEATURE_SPEC: %s\nIMPL_PLAN: %s\nSPECS_DIR: %s\nBRANCH: %s\n' \
    "$FEATURE_SPEC" "$IMPL_PLAN" "$FEATURE_DIR" "$CURRENT_BRANCH"
fi
