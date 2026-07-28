FROM node:20-alpine AS builder

# Enable pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy monorepo configuration & server script
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json server.js ./

# Copy packages
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build showcase package
RUN pnpm --filter showcase build

# Production server stage
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy static output and server script from builder
COPY --from=builder /app/packages/showcase/out ./packages/showcase/out
COPY --from=builder /app/server.js ./

EXPOSE 3000

# Run static server on Distroless Node.js
CMD ["server.js"]
