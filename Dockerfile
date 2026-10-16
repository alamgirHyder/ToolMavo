FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci --include=dev --no-audit --no-fund
COPY frontend/ ./frontend/
RUN npm --prefix frontend run build
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/frontend/dist ./frontend/dist
COPY package*.json ./
COPY server ./server
USER node
EXPOSE 8080
CMD ["node","server/index.js"]
