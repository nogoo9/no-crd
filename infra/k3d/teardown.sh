#!/usr/bin/env bash
set -euo pipefail

echo "==> Deleting k3d cluster nogoo-dev..."
k3d cluster delete nogoo-dev
echo "Done."
