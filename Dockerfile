FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.json tsconfig.options.json ./
RUN bun install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.options.json ./
COPY src ./src
COPY scripts ./scripts

# Build MCP server (bun bundle → dist/index.js)
RUN bun run build

FROM dhi.io/bun:1-alpine3.22 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
USER 65532
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
