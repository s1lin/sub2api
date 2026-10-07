#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
command_name="${1:-check}"

need_linux_tool() {
  local executable="$1"
  local resolved
  resolved="$(command -v "$executable" || true)"
  if [[ -z "$resolved" || "$resolved" == *.exe || "$resolved" == /mnt/* ]]; then
    printf 'Install %s inside WSL. See docs/WSL_DEVELOPMENT.md.\n' "$executable" >&2
    return 1
  fi
}

check_go() {
  need_linux_tool go || return 1
  local required_version
  required_version="$(awk '$1 == "go" { print $2; exit }' "$repo_dir/backend/go.mod")"
  if [[ "$(go env GOOS)" != linux ]]; then
    printf 'Use the Linux Go toolchain inside WSL.\n' >&2
    return 1
  fi
  printf 'Go installed: %s; go.mod requires %s\n' "$(go version)" "$required_version"
}

check_frontend() {
  need_linux_tool node || return 1
  need_linux_tool pnpm || return 1
  node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 19)) { console.error("Use Node 20.19+ in WSL"); process.exit(1) }' || return 1
  printf 'Node %s; pnpm %s\n' "$(node --version)" "$(pnpm --version)"
}

case "$command_name" in
  check)
    status=0
    check_go || status=1
    check_frontend || status=1
    printf 'Backend config: %s/backend/config.yaml\n' "$repo_dir"
    printf 'Default URLs: frontend http://localhost:3000; backend http://localhost:8080\n'
    exit "$status"
    ;;
  backend)
    check_go
    cd "$repo_dir/backend"
    export DATA_DIR="${DATA_DIR:-.}"
    exec go run ./cmd/server
    ;;
  frontend)
    check_frontend
    cd "$repo_dir/frontend"
    if [[ ! -d node_modules ]]; then
      printf 'Run pnpm install --frozen-lockfile in frontend first.\n' >&2
      exit 1
    fi
    exec pnpm dev
    ;;
  build)
    check_go
    check_frontend
    cd "$repo_dir/frontend"
    pnpm build
    cd "$repo_dir/backend"
    go build -tags embed -o tmp/server-wsl ./cmd/server
    ;;
  *)
    printf 'Usage: bash tools/dev-wsl.sh [check|backend|frontend|build]\n' >&2
    exit 2
    ;;
esac
