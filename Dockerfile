FROM node:22.20.0-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-update-notifier --no-audit --no-fund

COPY . .

RUN npm run build

####################################################
FROM node:22.20.0-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN addgroup -g 1001 -S nonroot && adduser -S nonroot -u 1001
USER nonroot

EXPOSE 3000

CMD ["node", "server.js"]
