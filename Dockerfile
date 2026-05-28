FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.json tsconfig.options.json ./
RUN bun install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.options.json typedoc.json ./
COPY src ./src
COPY scripts ./scripts
COPY docs ./docs
COPY themes ./themes
COPY templates ./templates
COPY README.md ./

# Build MCP server (bun bundle → dist/index.js) and frontend UI
RUN bun run build

# Build static documentation site
RUN env BASE_URL=/docs/ bun run docs:build

# Compile server entry to a standalone binary
RUN bun build src/server-entry.ts --compile --outfile dist/server-entry

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

LABEL org.opencontainers.image.title="no-crd" \
      org.opencontainers.image.description="Agent-driven, on-demand pod orchestration in Kubernetes (k8s/k3s) without Custom Resource Definitions" \
      org.opencontainers.image.authors="eterna2" \
      org.opencontainers.image.source="https://github.com/nogoo9/no-crd" \
      org.opencontainers.image.url="https://github.com/nogoo9/no-crd" \
      org.opencontainers.image.documentation="https://nogoo9.github.io/no-crd/" \
      org.opencontainers.image.licenses="Apache-2.0"

# Copy compiled bundle JS, UI assets, static documentation, themes, and templates
COPY --from=builder /app/dist/server-entry.js /app/server-entry.js
COPY --from=builder /app/dist/ui /app/ui
COPY --from=builder /app/docs/.vitepress/dist /app/docs
COPY --from=builder /app/themes /app/themes
COPY --from=builder /app/templates /app/templates

USER 65532
EXPOSE 3000
CMD ["node", "/app/server-entry.js"]
