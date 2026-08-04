package com.work.loanworkflow.config;

import java.util.Arrays;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    // Allowed origins come from the CORS_ORIGINS env var (comma-separated), so
    // production can add the deployed frontend URL. Defaults to the local Vite
    // dev server when unset, preserving current local behavior.
    private static final String[] ALLOWED_ORIGINS = resolveOrigins();

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(ALLOWED_ORIGINS)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    private static String[] resolveOrigins() {
        String raw = System.getenv("CORS_ORIGINS");
        if (raw == null || raw.isBlank()) {
            raw = "http://localhost:5173";
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toArray(String[]::new);
    }
}
