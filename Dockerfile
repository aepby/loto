# syntax=docker/dockerfile:1

# OpenSSL is required by the Prisma schema engine (migrations) on Alpine.
FROM node:24-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Files the `prisma generate` postinstall hook needs during `npm ci`.
FROM base AS manifests
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

# ---- Dependencies -----------------------------------------------------------
FROM manifests AS deps
RUN npm ci

# Installed separately instead of pruning the build tree: pruning would leave the
# full node_modules in an earlier layer and keep it in the final image.
FROM manifests AS prod-deps
RUN npm ci --omit=dev && npm cache clean --force

# ---- Build ------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# lib/db.ts parses DATABASE_URL when imported. No connection is opened at build
# time, so a placeholder is enough to compile the routes.
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/build"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Ownership is set per COPY: a `chown -R` on node_modules would duplicate it into
# an extra layer and roughly double the image size. Only .next needs to be
# writable at runtime (Next.js cache), everything else stays read-only.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Sources needed by the seed script, which shares the app's database connection.
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "run", "start"]
