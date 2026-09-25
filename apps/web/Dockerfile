# syntax=docker/dockerfile:1
# web (Astro SSR on Node) image. Build context: the repository root (pnpm workspace).
#   docker build -f apps/web/Dockerfile .

ARG NODE_IMAGE=node:24.21.0-alpine3.24

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NX_DAEMON=false \
    NX_NO_CLOUD=true \
    NX_SKIP_NX_CACHE=true
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Fetch every package from the lockfile alone: cached until the lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile
ARG BEDA_BASE_URL=https://beda.lol
ENV BEDA_BASE_URL=${BEDA_BASE_URL}
# Nx builds web and whatever it depends on (Nx replaces `turbo prune`).
RUN pnpm exec nx run web:build --outputStyle=static
# Production dependencies only, plus the built dist/.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter web deploy --prod --legacy /out

FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321
WORKDIR /app
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
USER node
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
