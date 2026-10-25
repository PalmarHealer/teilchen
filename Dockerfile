FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm exec svelte-kit sync && pnpm build && pnpm prune --prod --ignore-scripts

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production BODY_SIZE_LIMIT=10M
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/build build
COPY --from=build /app/src src
COPY --from=build /app/drizzle drizzle
USER node
EXPOSE 3000
# Worker: compose overrides the command with `node_modules/.bin/tsx src/worker/index.ts`
CMD ["sh", "-c", "node_modules/.bin/tsx src/lib/server/db/migrate.ts && node build"]
