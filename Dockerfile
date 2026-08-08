# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies from the lockfile (reproducible). Copied before the rest
# of the source so this layer is cached unless package.json/package-lock.json change.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the source and produce the `output: "standalone"` build.
COPY . .
RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3102
ENV HOSTNAME=0.0.0.0

# The standalone server.js ships self-contained. Copy it with static assets.
COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/standalone/.next/static
COPY --from=builder /app/public ./.next/standalone/public

WORKDIR /app/.next/standalone

EXPOSE 3102

CMD ["node", "server.js"]
