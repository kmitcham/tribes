#!/bin/bash

# Run script for Tribes Game Docker container
echo "Starting Tribes Game server..."

# Stop existing container if it exists
docker stop tribes-server 2>/dev/null
docker rm tribes-server 2>/dev/null

# Run the container with volume mounts for persistence
docker run -d \
  --name tribes-server \
  -p 0.0.0.0:8088:8088 \
  -v $(pwd)/bear-tribe:/app/bear-tribe \
  -v $(pwd)/flounder-tribe:/app/flounder-tribe \
  -v $(pwd)/bug-tribe:/app/bug-tribe \
  -v $(pwd)/vashon-tribe:/app/vashon-tribe \
  -v $(pwd)/mib-tribe:/app/mib-tribe \
  -v $(pwd)/sloth-tribe:/app/sloth-tribe \
  -v $(pwd)/wolf-tribe:/app/wolf-tribe \
  -v $(pwd)/users.json:/app/users.json \
  --restart unless-stopped \
  tribes-game:latest

if [ $? -eq 0 ]; then
    echo "✅ Tribes server started successfully!"
    echo ""
    echo "🌐 Local access:"
    echo "   Game interface: http://localhost:8088"
    echo "   Health check: http://localhost:8088/health"
    echo ""
    echo "🌐 Network access (share with others):"
    echo "   Game interface: http://$(hostname -I | awk '{print $1}'):8088"
    echo "   Health check: http://$(hostname -I | awk '{print $1}'):8088/health"
    echo ""
    echo "📊 To view logs: docker logs -f tribes-server"
    echo "⏹️ To stop: docker stop tribes-server"
    echo ""
    echo "Checking server status..."
    sleep 5
    curl -s http://localhost:8088/health | jq '.' 2>/dev/null || echo "Server starting up..."
else
    echo "❌ Failed to start server!"
    exit 1
fi