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

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

ADD https://github.com/microsoft/ApplicationInsights-Java/releases/download/3.5.4/applicationinsights-agent-3.5.4.jar /opt/applicationinsights-agent.jar

COPY --from=build /app/target/*.jar app.jar

RUN chown -R app:app /app /opt/applicationinsights-agent.jar
RUN mkdir -p /tmp/app && chown app:app /tmp/app

USER app

EXPOSE 8083

ENTRYPOINT ["java", "-Djava.io.tmpdir=/tmp/app", "-jar", "app.jar"]
