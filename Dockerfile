# --- build stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Deployment gate: a source build cannot replace production until both
# behavioral suites pass. Coolify only proceeds to health-checked runtime
# after this stage completes.
RUN npm run test && npm run build

# --- runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3103
# @astrojs/node standalone output does not trace a minimal node_modules —
# entry.mjs imports astro + prod deps at runtime, so a full production
# install is required. package.json kept for ESM resolution.
COPY package*.json ./
# Coolify's HTTP health gate executes curl inside this runtime image.
RUN apk add --no-cache curl \
    && npm ci --omit=dev \
    && npm cache clean --force
COPY --from=builder --chown=node:node /app/dist ./dist
# Keystatic local-mode storage: content collections live on disk (read + admin writes)
COPY --from=builder --chown=node:node /app/src/content ./src/content
USER node
EXPOSE 3103
CMD ["node", "./dist/server/entry.mjs"]
