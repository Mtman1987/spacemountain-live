FROM node:20-slim AS build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
ARG GITHUB_SHA=unknown
ARG GH_SHA=unknown
ARG BUILD_SHA=unknown
LABEL GITHUB_SHA=$GITHUB_SHA
LABEL GH_SHA=$GH_SHA
LABEL BUILD_SHA=$BUILD_SHA
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database.db
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
