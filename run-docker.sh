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
  -v $(pwd)/bear:/app/bear \
  -v $(pwd)/flounder:/app/flounder \
  -v $(pwd)/bug:/app/bug \
  -v $(pwd)/vashon:/app/vashon \
  -v $(pwd)/mib:/app/mib \
  -v $(pwd)/sloth:/app/sloth \
  -v $(pwd)/wolf:/app/wolf \
  -v $(pwd)/users.json:/app/users.json \
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
    echo "   Game interface: http://$(hostname -I | awk '{print $1}'):8000"
    echo "   Health check: http://$(hostname -I | awk '{print $1}'):8000/health"
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