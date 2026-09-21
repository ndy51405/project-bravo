# Multi-stage Dockerfile for production build

# Stage 1: Build Frontend (Vite) & Backend (esbuild)
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient caching
COPY package*.json ./
RUN npm ci

# Copy all source files and build
COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets and server bundle from builder
COPY --from=builder /app/dist ./dist

# Use non-root node user for security
USER node

EXPOSE 3000

# Pino logs stdout (info/warn) and stderr (error/fatal) directly to Docker logging driver
CMD ["node", "dist/server.cjs"]

