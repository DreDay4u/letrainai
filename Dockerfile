# --- build stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/content ./src/content
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
