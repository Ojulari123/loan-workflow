package com.work.loanworkflow.config;

public class DBConfig {
    // DB connection is env-driven with local-dev defaults. Two ways to configure:
    //   1) Set DB_URL to a full "jdbc:mysql://..." string (takes precedence), OR
    //   2) Set DB_HOST / DB_PORT / DB_NAME and the URL is built from them.
    // Credentials come from DB_USER / DB_PASSWORD. When nothing is set, the values
    // below reproduce the current local setup exactly (localhost:3307/loan_app_db).
    public static final String URL = resolveUrl();
    public static final String USER = env("DB_USER", "admin");
    public static final String PASSWORD = env("DB_PASSWORD", "admin123");

    private static String resolveUrl() {
        String fullUrl = System.getenv("DB_URL");
        if (fullUrl != null && !fullUrl.isBlank()) {
            return fullUrl;
        }
        String host = env("DB_HOST", "localhost");
        String port = env("DB_PORT", "3307");
        String name = env("DB_NAME", "loan_app_db");
        return "jdbc:mysql://" + host + ":" + port + "/" + name
                + "?useSSL=false&serverTimezone=UTC";
    }

    private static String env(String key, String defaultValue) {
        String value = System.getenv(key);
        return (value == null || value.isBlank()) ? defaultValue : value;
    }
}
