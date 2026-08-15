FROM node:22-slim AS build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts

FROM node:22-slim
ARG GITHUB_SHA=unknown
ARG GH_SHA=unknown
ARG BUILD_SHA=unknown
LABEL GITHUB_SHA=$GITHUB_SHA
LABEL GH_SHA=$GH_SHA
LABEL BUILD_SHA=$BUILD_SHA
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public
COPY oauth-state-bootstrap.cjs ./oauth-state-bootstrap.cjs
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database.db
EXPOSE 3000
CMD ["node", "oauth-state-bootstrap.cjs"]
