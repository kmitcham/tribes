#!/bin/bash

set -e

# Build script for Tribes Game Docker container
echo "Building Tribes Game Docker container..."

# Prefer git metadata when available, but allow CI/env-provided values.
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        TRIBES_LAST_COMMIT_DATE="${TRIBES_LAST_COMMIT_DATE:-$(git log -1 --format=%cI 2>/dev/null || true)}"
        TRIBES_LAST_COMMIT_DATE_SHORT="${TRIBES_LAST_COMMIT_DATE_SHORT:-$(git log -1 --format=%cs 2>/dev/null || true)}"
        TRIBES_LAST_COMMIT_HASH="${TRIBES_LAST_COMMIT_HASH:-$(git rev-parse --short HEAD 2>/dev/null || true)}"
fi

export TRIBES_LAST_COMMIT_DATE
export TRIBES_LAST_COMMIT_DATE_SHORT
export TRIBES_LAST_COMMIT_HASH

# Build the Docker image
docker build \
    --build-arg TRIBES_LAST_COMMIT_DATE="$TRIBES_LAST_COMMIT_DATE" \
    --build-arg TRIBES_LAST_COMMIT_DATE_SHORT="$TRIBES_LAST_COMMIT_DATE_SHORT" \
    --build-arg TRIBES_LAST_COMMIT_HASH="$TRIBES_LAST_COMMIT_HASH" \
    -t tribes-game:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the container:"
    echo "docker run -p 8000:8000 --name tribes-server tribes-game:latest"
    echo ""
    echo "Or use the run script: ./run-docker.sh"
else
    echo "❌ Build failed!"
    exit 1
fi