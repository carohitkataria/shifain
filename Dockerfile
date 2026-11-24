# Runs Shifain on any server with Docker (used by the shared SalonHub + Shifain
# server on AWS Lightsail; Render does not use this file).
#
# The .env next to this file is read twice: by `next build` (the marketing
# pages are rendered at build time from the published content in MongoDB) and
# by the running server (docker compose `env_file`). It never leaves the server.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SHIFAIN_ENQUIRY_LOG=/app/.data/enquiries.jsonl
COPY --from=build /app/package.json /app/next.config.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/content ./content
RUN mkdir -p .data && chown -R node:node .data .next
USER node
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
