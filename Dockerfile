FROM node:24-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build
FROM maven:3.9.11-eclipse-temurin-21 AS backend
WORKDIR /build/backend
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /build/frontend/dist /build/frontend/dist
RUN mvn -B package
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S toolmavo && adduser -S toolmavo -G toolmavo
USER toolmavo
WORKDIR /app
COPY --from=backend /build/backend/target/toolmavo-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
