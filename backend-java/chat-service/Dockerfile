# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN ./mvnw clean package -DskipTests -Dproject.build.sourceEncoding=UTF-8

# Stage 2: Run
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

ADD https://github.com/microsoft/ApplicationInsights-Java/releases/download/3.5.4/applicationinsights-agent-3.5.4.jar /opt/applicationinsights-agent.jar

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose HTTP/WebSocket port. STOMP endpoint is /api/ws on this same port.
EXPOSE 8083

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]
