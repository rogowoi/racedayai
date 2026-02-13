#!/bin/bash

# RaceDayAI Deploy Script
# Execute the following steps in order

set -e  # Exit on first error

cd "$(dirname "$0")"

echo "=== Step 1: Build check ==="
pnpm --filter web build

echo ""
echo "=== Step 2: Push to origin ==="
git push origin main

echo ""
echo "=== Step 3: Production migration ==="
cd apps/web
npx prisma migrate deploy

echo ""
echo "=== Deployment Complete ==="
