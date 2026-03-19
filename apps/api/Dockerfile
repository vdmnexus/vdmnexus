FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.9.0 --activate

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter api

# Copy API source
COPY apps/api apps/api

# Build
RUN cd apps/api && pnpm build

WORKDIR /app/apps/api

EXPOSE 4000
CMD ["node", "dist/index.js"]
