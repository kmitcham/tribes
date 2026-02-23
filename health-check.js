const http = require('http');

// Simple health check endpoint
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() })
    );
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = process.env.HEALTH_PORT || 8089;
server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});

module.exports = server;
