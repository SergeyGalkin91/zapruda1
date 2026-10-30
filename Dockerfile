# syntax=docker/dockerfile:1
# Production ZAPRUDA (TanStack Start / Nitro Node server)
FROM oven/bun:1.3.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
# Override the cloud-hosting preset for a standalone Docker runtime.
ENV NITRO_PRESET=node-server
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" && bun run build && test -f .output/server/index.mjs

FROM node:22-alpine AS runtime
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.revision=${GIT_SHA}
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.output/ ./.output/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status < 500 ? 0 : 1)).catch(()=>process.exit(1))"
# All browser assets are built with correct PUBLIC configuration; never mutate output files after build.
CMD ["node", ".output/server/index.mjs"]
