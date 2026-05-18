# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_RUNTIME_ENV=production
ARG VITE_API_BASE_URL
ARG VITE_FRONTEND_URL
ARG VITE_USE_BEARER_AUTH

ENV VITE_RUNTIME_ENV=${VITE_RUNTIME_ENV:-production} \
    NODE_ENV=${VITE_RUNTIME_ENV:-production} \
    VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_FRONTEND_URL=${VITE_FRONTEND_URL} \
    VITE_USE_BEARER_AUTH=${VITE_USE_BEARER_AUTH:-true}

COPY package*.json ./
RUN npm ci --no-audit --no-fund --include=dev

COPY . .
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s CMD curl -fsS http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
