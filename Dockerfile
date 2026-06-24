FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database.db
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
