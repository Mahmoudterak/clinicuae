#!/bin/bash
set -e

# Install / update dependencies
pnpm install

# Push DB schema changes (non-interactive, force)
pnpm --filter @workspace/db run push-force

# Regenerate API client & Zod types from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
