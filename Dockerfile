FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

ENV DATABASE_URL=postgresql://localkb:localkb@postgres:5432/localkb?schema=public

COPY . .
RUN npm run db:generate && npm run build

FROM deps AS tools

ENV DATABASE_URL=postgresql://localkb:localkb@postgres:5432/localkb?schema=public

COPY . .
RUN npm run db:generate

CMD ["sh"]

FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat su-exec wget

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

# Normalize CRLF to LF so Windows checkouts do not break the Alpine entrypoint.
RUN sed -i 's/\r$//' ./docker-entrypoint.sh \
  && chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/public/uploads \
  && chown -R node:node /app

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
