FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - serve the built static files with nginx.
# The builder stage is discarded - final image contains only nginx
# and the compiled assets, not Node.js or source code.
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to handle React's client-side routing -
# without this, refreshing any non-root URL returns a 404 from nginx
# because the file doesn't exist on disk (React Router handles it).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]