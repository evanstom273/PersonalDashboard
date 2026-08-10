#!/usr/bin/env bash
set -euo pipefail

# Vercel builds are disabled — GitHub Pages is primary hosting.
# Exit 0 skips the build; exit 1 would proceed.
# Re-enable via vercel.json git.deploymentEnabled when needed.
echo "Vercel builds are disabled."
exit 0
