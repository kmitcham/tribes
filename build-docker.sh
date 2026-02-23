#!/bin/bash

# Build script for Tribes Game Docker container
echo "Building Tribes Game Docker container..."

# Build the Docker image
docker build -t tribes-game:latest .

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