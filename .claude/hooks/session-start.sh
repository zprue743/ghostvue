#!/bin/bash
# Start the Docker daemon in Claude Code cloud sessions so Docker-based scripts
# such as `pnpm test:visual:docker` work. The cloud image ships dockerd but does
# not run it, and the environment cache keeps files but not processes, so the
# daemon has to be started again in every session.
set -euo pipefail

# Local machines manage their own Docker; only act in cloud sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Resume, clear and compact also fire SessionStart: skip if already running.
if docker info >/dev/null 2>&1; then
  exit 0
fi

if ! command -v dockerd >/dev/null 2>&1; then
  echo "session-start: dockerd not installed; skipping Docker startup" >&2
  exit 0
fi

log=/tmp/dockerd.log
nohup dockerd >"$log" 2>&1 &

# Wait up to 30s for the daemon to answer. Failing to start must not block the
# session, since only the visual-baseline workflow needs Docker.
for _ in $(seq 1 30); do
  if docker info >/dev/null 2>&1; then
    echo "session-start: Docker daemon started" >&2
    exit 0
  fi
  sleep 1
done

echo "session-start: dockerd did not become ready within 30s; see $log" >&2
tail -n 20 "$log" >&2 || true
exit 0
