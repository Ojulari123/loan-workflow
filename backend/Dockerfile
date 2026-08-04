# --- Stage 1: build the executable Spring Boot jar ---
# Gradle 9.2.1 matches this repo's gradle/wrapper version; JDK 17 matches the
# build.gradle toolchain. Build context should be the backend/ directory.
FROM gradle:9.2.1-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle bootJar --no-daemon

# --- Stage 2: minimal runtime ---
FROM eclipse-temurin:17-jre
WORKDIR /app
# Only bootJar runs in stage 1, so build/libs holds exactly one jar.
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar
# App binds to $PORT when injected (Railway), else 8080 (see application.properties).
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
