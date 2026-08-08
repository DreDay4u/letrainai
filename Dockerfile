# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time env vars (read by API route collection during next build)
# Values are baked only into the build analysis pass, not into runtime secrets.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG DEEPSEEK_API_KEY
ARG R2_ACCESS_KEY_ID
ARG R2_SECRET_ACCESS_KEY
ARG R2_ACCOUNT_ID
ARG R2_BUCKET_NAME
ARG R2_S3_ENDPOINT
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
ENV R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
ENV R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
ENV R2_ACCOUNT_ID=$R2_ACCOUNT_ID
ENV R2_BUCKET_NAME=$R2_BUCKET_NAME
ENV R2_S3_ENDPOINT=$R2_S3_ENDPOINT
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3102
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./.next/standalone
COPY --from=builder /app/.next/static ./.next/standalone/.next/static
COPY --from=builder /app/public ./.next/standalone/public

# Keystatic reader needs raw content files + config at runtime
COPY --from=builder /app/src/content ./.next/standalone/src/content
COPY --from=builder /app/keystatic.config.tsx ./.next/standalone/keystatic.config.tsx

WORKDIR /app/.next/standalone

EXPOSE 3102

CMD ["node", "server.js"]
