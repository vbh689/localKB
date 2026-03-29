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

RUN apk add --no-cache libc6-compat wget

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/public/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
