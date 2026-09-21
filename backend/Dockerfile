FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (layer caching - npm install only re-runs
# when package.json changes, not on every code change)
COPY package*.json ./

# Install production dependencies only - devDependencies (nodemon,
# jest) are not needed in the container
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

# Non-root user for security - never run Node in production as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000

CMD ["node", "src/app.js"]