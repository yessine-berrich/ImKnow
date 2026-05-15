#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ImKnow – Robot Framework test runner (Linux / macOS / Git Bash on Windows)
# Usage:
#   ./run_tests.sh                    → run all tests
#   ./run_tests.sh smoke              → run only tests tagged "smoke"
#   ./run_tests.sh auth               → run only tests tagged "auth"
#   ./run_tests.sh tests/01_auth      → run a specific suite folder
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

TAG="${1:-}"
RESULTS="results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS"

run_robot() {
    robot \
        --outputdir "$RESULTS" \
        --log      "log_${TIMESTAMP}.html" \
        --report   "report_${TIMESTAMP}.html" \
        "$@"
}

if [[ -z "$TAG" ]]; then
    echo "▶ Running ALL tests…"
    run_robot tests/
elif [[ -d "tests/$TAG" ]]; then
    echo "▶ Running suite: tests/$TAG"
    run_robot "tests/$TAG"
else
    echo "▶ Running tests with tag: $TAG"
    run_robot --include "$TAG" tests/
fi

echo ""
echo "✅ Results saved to: $RESULTS/"
