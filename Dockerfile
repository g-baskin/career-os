FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
RUN npx prisma generate
RUN npm run build -w @career-os/web

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@career-os/web"]
