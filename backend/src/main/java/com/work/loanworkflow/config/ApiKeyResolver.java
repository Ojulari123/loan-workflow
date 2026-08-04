package com.work.loanworkflow.config;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Resolves the Anthropic API key without any extra dependencies.
 *
 * <p>Resolution order:</p>
 * <ol>
 *   <li>The {@code ANTHROPIC_API_KEY} process environment variable.</li>
 *   <li>An {@code ANTHROPIC_API_KEY=...} line in {@code backend/.env}
 *       (blank lines and {@code #} comments are ignored; surrounding quotes are stripped).</li>
 * </ol>
 *
 * <p>The key value is never logged, printed, or echoed.</p>
 */
public final class ApiKeyResolver {

    public static final String ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY";

    // backend/.env, resolved relative to the process working directory (repo backend root when run via Gradle).
    private static final Path DEFAULT_ENV_FILE = Paths.get(".env").toAbsolutePath();

    private ApiKeyResolver() {
    }

    /**
     * @return the resolved Anthropic API key, or {@code null} if not found in either source.
     */
    public static String resolveAnthropicKey() {
        String fromEnv = System.getenv(ANTHROPIC_API_KEY);
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv.trim();
        }
        return readFromEnvFile(DEFAULT_ENV_FILE, ANTHROPIC_API_KEY);
    }

    static String readFromEnvFile(Path envFile, String key) {
        if (envFile == null || !Files.isRegularFile(envFile)) {
            return null;
        }
        try (BufferedReader reader = Files.newBufferedReader(envFile)) {
            String line;
            String prefix = key + "=";
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (trimmed.startsWith(prefix)) {
                    String value = trimmed.substring(prefix.length()).trim();
                    value = stripQuotes(value);
                    return value.isEmpty() ? null : value;
                }
            }
        } catch (IOException e) {
            // Unreadable .env is treated as "no key"; do not surface file contents.
            return null;
        }
        return null;
    }

    private static String stripQuotes(String value) {
        if (value.length() >= 2) {
            char first = value.charAt(0);
            char last = value.charAt(value.length() - 1);
            if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }
}
