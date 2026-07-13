# Use Node.js 18 as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json* ./
RUN npm install --only=production

# Copy the main server file explicitly
COPY websocket-server.js ./

# Copy the rest of the application files
COPY . .

# Verify critical files exist (for debugging)
RUN ls -la /app/ && echo "Checking for websocket-server.js:" && ls -la /app/websocket-server.js

# Create necessary directories for data persistence  
RUN mkdir -p /app/archive /app/logs /app/tribe-data/bug /app/tribe-data/bear /app/tribe-data/sloth /app/tribe-data/wolf /app/tribe-data/vashon /app/tribe-data/mib /app/tribe-data/flounder /app/tribe-data/bat /app/tribe-data/loon /app/tribe-data/yak /app/tribe-data/zebra

# Expose the port the app runs on
EXPOSE 8000

# Build metadata injected at image build time
ARG TRIBES_LAST_COMMIT_DATE
ARG TRIBES_LAST_COMMIT_DATE_SHORT
ARG TRIBES_LAST_COMMIT_HASH

# Set environment variables
ENV PORT=8000
ENV NODE_ENV=production
ENV TRIBES_LAST_COMMIT_DATE=${TRIBES_LAST_COMMIT_DATE}
ENV TRIBES_LAST_COMMIT_DATE_SHORT=${TRIBES_LAST_COMMIT_DATE_SHORT}
ENV TRIBES_LAST_COMMIT_HASH=${TRIBES_LAST_COMMIT_HASH}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

RUN ls -la /app/ && echo "Checking for websocket-server.js:" && ls -la /app/websocket-server.js

# Create a non-root user for security
RUN addgroup -g 1001 -S tribesuser && \
    adduser -S tribesuser -u 1001

# Change ownership of the app directory to the non-root user
RUN chown -R tribesuser:tribesuser /app

# Switch to non-root user
USER tribesuser

# Command to run the application
CMD ["node", "websocket-server.js"]