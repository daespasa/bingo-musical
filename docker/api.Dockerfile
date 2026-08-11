FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY packages/music-providers/package.json packages/music-providers/
# El `postinstall` de @bingo/database ejecuta `prisma generate`, que necesita el
# esquema. Se copia antes de instalar para que exista cuando se lance; si no,
# la instalación falla con «schema.prisma: file not found».
COPY packages/database/prisma packages/database/prisma
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @bingo/database prisma:generate \
  && pnpm --filter @bingo/shared build \
  && pnpm --filter @bingo/music-providers build \
  && pnpm --filter @bingo/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3001
CMD ["sh", "-c", "pnpm --filter @bingo/database migrate:deploy && node apps/api/dist/main.js"]
