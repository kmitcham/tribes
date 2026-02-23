# Cloud Deployment Guide

This guide covers deploying the Tribes Game to cloud container services.

## Common Cloud Services

### Azure Container Instances (ACI)
```bash
# Build and push to Azure Container Registry
az acr create --resource-group myResourceGroup --name myregistry --sku Basic
az acr login --name myregistry
docker tag tribes-game:latest myregistry.azurecr.io/tribes-game:latest
docker push myregistry.azurecr.io/tribes-game:latest

# Deploy to ACI
az container create \
  --resource-group myResourceGroup \
  --name tribes-game \
  --image myregistry.azurecr.io/tribes-game:latest \
  --dns-name-label tribes-game-unique \
  --ports 8000 \
  --cpu 1 \
  --memory 1
```

### AWS Fargate (ECS)
```bash
# Push to ECR and deploy with CloudFormation or Terraform
# Ensure ALB/NLB supports WebSocket connections
```

### Google Cloud Run
```bash
# Deploy to Cloud Run
gcloud run deploy tribes-game \
  --image gcr.io/PROJECT-ID/tribes-game:latest \
  --platform managed \
  --port 8000 \
  --allow-unauthenticated
```

## WebSocket Compatibility

### Load Balancers
Most cloud load balancers need WebSocket support enabled:

- **Azure Application Gateway**: Enable WebSocket protocol
- **AWS ALB**: WebSocket support is automatic
- **Google Cloud Load Balancer**: Configure health checks properly

### Common Issues

1. **Health endpoint works but game doesn't load**
   - WebSocket connections are being blocked
   - Check load balancer WebSocket configuration
   - Verify firewall rules allow WebSocket traffic

2. **Connection timeouts**
   - Cloud services often have shorter WebSocket timeouts
   - Implement keep-alive pings (already included in client)

3. **HTTPS/WSS issues**
   - If your cloud service uses HTTPS, WebSocket connections must use WSS
   - The client now automatically detects and uses WSS for HTTPS pages

## Environment Variables

Set these environment variables in your cloud service:

```bash
PORT=8000                    # Container port
NODE_ENV=production         # Production optimizations
```

## Debugging

1. **Check container logs**:
   ```bash
   # Azure
   az container logs --name tribes-game --resource-group myResourceGroup
   
   # AWS ECS
   aws logs get-log-events --log-group-name /ecs/tribes-game
   
   # Docker locally
   docker logs tribes-server
   ```

2. **Test WebSocket connection**:
   ```javascript
   // In browser console on your cloud URL
   const ws = new WebSocket('wss://your-cloud-url.com');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (e) => console.log('Error:', e);
   ```

3. **Health check**:
   ```bash
   curl https://your-cloud-url.com/health
   ```

## Security Considerations

1. **CORS**: Already configured to allow all origins for game compatibility
2. **WebSocket Security**: Consider adding authentication for production
3. **Rate Limiting**: Implement if expecting high traffic
4. **HTTPS**: Always use HTTPS in production (cloud services usually provide this)

## Performance Tips

1. **Resource Allocation**: 
   - Minimum: 1 CPU, 1GB RAM
   - Recommended: 2 CPU, 2GB RAM for multiple players

2. **Persistent Storage**:
   - Mount volumes for game data persistence
   - Use cloud storage services for backups

3. **Scaling**:
   - Most cloud services support auto-scaling
   - Monitor WebSocket connection counts in health endpoint

## Troubleshooting WebSocket Issues

If WebSocket connections fail after deployment:

1. **Check browser console** for connection errors
2. **Verify protocol** - HTTP sites use `ws://`, HTTPS sites use `wss://`
3. **Test with curl** or browser tools to verify WebSocket support
4. **Check cloud service logs** for WebSocket-specific errors
5. **Verify firewall rules** allow WebSocket traffic on port 8000

The recent updates automatically handle:
- ✅ Protocol detection (ws:// vs wss://)
- ✅ Hostname detection (cloud vs local)
- ✅ CORS headers for cross-origin requests
- ✅ Proper error handling and connection cleanup