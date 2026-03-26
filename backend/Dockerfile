FROM node:20-bookworm-slim AS base
WORKDIR /app

# Install OpenSSL to satisfy Prisma runtime requirements
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src

# Provide placeholder DATABASE_URL so prisma generate can read schema
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"

# Generate Prisma client for TypeScript compilation
RUN npx prisma generate

# Build NestJS app
RUN npm run build

EXPOSE 3001
ENV NODE_ENV=production

# Copy entrypoint and use it to optionally run migrate/seed
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Default command: entrypoint controls migrate/seed via env flags
CMD ["sh", "./docker-entrypoint.sh"]
