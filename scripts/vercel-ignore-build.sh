#!/usr/bin/env bash
set -euo pipefail

# Vercel: exit 0 skips the build, exit 1 proceeds.
if [[ "${VERCEL_GIT_COMMIT_REF:-}" == "main" ]]; then
	echo "Building production deployment for main."
	exit 1
fi

echo "Skipping Vercel build for branch: ${VERCEL_GIT_COMMIT_REF:-unknown}"
exit 0
