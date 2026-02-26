#!/bin/bash

# Run script for Tribes Game Docker container
echo "Starting Tribes Game server..."

# Stop existing container if it exists
docker stop tribes-server 2>/dev/null
docker rm tribes-server 2>/dev/null

# Run the container with volume mounts for persistence
docker run -d \
  --name tribes-server \
  -p 0.0.0.0:8000:8000 \
  -v $(pwd)/tribe-data/bear:/app/tribe-data/bear \
  -v $(pwd)/tribe-data/flounder:/app/tribe-data/flounder \
  -v $(pwd)/tribe-data/bug:/app/tribe-data/bug \
  -v $(pwd)/tribe-data/vashon:/app/tribe-data/vashon \
  -v $(pwd)/tribe-data/mib:/app/tribe-data/mib \
  -v $(pwd)/tribe-data/sloth:/app/tribe-data/sloth \
  -v $(pwd)/tribe-data/wolf:/app/tribe-data/wolf \
  -v $(pwd)/tribe-data/users.json:/app/tribe-data/users.json \
  -v $(pwd)/archive:/app/archive \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  tribes-game:latest

if [ $? -eq 0 ]; then
    echo "✅ Tribes server started successfully!"
    echo ""
    echo "🌐 Local access:"
    echo "   Game interface: http://localhost:8000"
    echo "   Health check: http://localhost:8000/health"
    echo ""
    echo "🌐 Network access (share with others):"
    echo "   Game interface: http://$(hostname | awk '{print $1}'):8000"
    echo "   Health check: http://$(hostname | awk '{print $1}'):8000/health"
    echo ""
    echo "📊 To view logs: docker logs -f tribes-server"
    echo "⏹️ To stop: docker stop tribes-server"
    echo ""
    echo "Checking server status..."
    sleep 5
    curl -s http://localhost:8000/health | jq '.' 2>/dev/null || echo "Server starting up..."
else
    echo "❌ Failed to start server!"
    exit 1
fi