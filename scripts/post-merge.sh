#!/bin/bash
set -e

# Install dependencies (allow lockfile updates from merges)
pnpm install

# Run DB migrations
pnpm --filter @workspace/db run push

# Regenerate API client from OpenAPI spec
cd lib/api-spec && pnpm run codegen
cd /home/runner/workspace
