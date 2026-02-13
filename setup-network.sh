#!/bin/bash

# Network setup script for Tribes Game
echo "🌐 Tribes Game - Network Access Setup"
echo "====================================="

# Get local IP address
LOCAL_IP=""

# Try different methods to get IP address
if command -v ipconfig &> /dev/null; then
    # macOS - try different interfaces
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
fi

if [ -z "$LOCAL_IP" ] && command -v hostname &> /dev/null; then
    # Linux
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ]; then
    # Fallback using ifconfig
    LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
fi

if [ -z "$LOCAL_IP" ]; then
    # Another fallback
    LOCAL_IP="192.168.1.20"
    echo "⚠️  Could not auto-detect IP address"
    echo "   Using fallback IP: $LOCAL_IP"
    echo "   If this is incorrect, check with: ifconfig | grep 'inet '"
    echo ""
fi

echo "✅ Your local IP address: $LOCAL_IP"
echo ""
echo "📡 For others to access the game on your network:"
echo ""
echo "1. Start the tribes server (if not already running):"
echo "   ./run-dev.sh"
echo "   OR"
echo "   ./run-docker.sh"
echo ""
echo "2. Share this URL with others on your network:"
echo "   🎮 http://$LOCAL_IP:8088"
echo ""
echo "3. Others should be able to:"
echo "   • Open the URL in their web browser"
echo "   • Register with their own player name"
echo "   • Join the same tribes and play together"
echo ""
echo "🔒 Security Notes:"
echo "   • This only works on your local network (WiFi/Ethernet)"
echo "   • People outside your network cannot access the game"
echo "   • Consider your router's firewall settings if having issues"
echo ""
echo "🔧 Troubleshooting:"
echo "   • Test the connection: curl http://$LOCAL_IP:8088/health"
echo "   • Check firewall settings on this computer"
echo "   • Ensure port 8088 is not blocked by your router"
echo "   • Make sure all devices are on the same network"

# Test if server is running
echo ""
echo "🧪 Testing server status..."
if curl -s "http://localhost:8088/health" > /dev/null 2>&1; then
    echo "✅ Server is running locally"
    
    if curl -s "http://$LOCAL_IP:8088/health" > /dev/null 2>&1; then
        echo "✅ Server is accessible on network at http://$LOCAL_IP:8088"
        echo ""
        echo "🎉 Ready to share! Send this link to your friends:"
        echo "   http://$LOCAL_IP:8088"
    else
        echo "⚠️  Server may not be accessible from other devices"
        echo "   Check firewall settings"
    fi
else
    echo "❌ Server is not running. Start it first with:"
    echo "   ./run-dev.sh"
fi