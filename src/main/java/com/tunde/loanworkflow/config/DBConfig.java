package com.tunde.loanworkflow.config;

public class DBConfig {
    public static final String URL = System.getenv().getOrDefault(
        "DB_URL", 
        "jdbc:mysql://localhost:3306/loan_app_db?useSSL=false&serverTimezone=UTC"
    );
    public static final String USER = System.getenv().getOrDefault("DB_USER", "admin");
    public static final String PASSWORD = System.getenv().getOrDefault("DB_PASSWORD", "admin123");
}