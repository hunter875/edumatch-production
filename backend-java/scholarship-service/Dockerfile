# --------------------
# Build stage
# --------------------
FROM maven:3.9.2-eclipse-temurin-17 AS build
WORKDIR /app

# Copy Maven wrapper và file cấu hình
COPY mvnw ./
COPY .mvn .mvn
COPY pom.xml ./

# Fix line endings and make mvnw executable
RUN dos2unix mvnw || sed -i 's/\r$//' mvnw
RUN chmod +x mvnw

# Tải dependency trước để cache
RUN ./mvnw dependency:go-offline -B

# Copy toàn bộ source
COPY src ./src

# Fix encoding issues in properties files
RUN find src/main/resources -name "*.properties" -type f -exec sh -c 'iconv -f UTF-8 -t UTF-8 -c "$1" > "$1.tmp" && mv "$1.tmp" "$1"' _ {} \; || true

# Build project with explicit encoding
RUN ./mvnw package -DskipTests -B -Dproject.build.sourceEncoding=UTF-8

# --------------------
# Run stage
# --------------------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

ADD https://github.com/microsoft/ApplicationInsights-Java/releases/download/3.5.4/applicationinsights-agent-3.5.4.jar /opt/applicationinsights-agent.jar

# Copy jar từ stage build
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
