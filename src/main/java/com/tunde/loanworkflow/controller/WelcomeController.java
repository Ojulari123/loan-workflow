package com.tunde.loanworkflow.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class WelcomeController {

    @GetMapping("/")
    public Map<String, Object> welcome() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Welcome to Loan Application API");
        response.put("status", "running");
        response.put("documentation", "http://localhost:8080/swagger-ui.html");
        response.put("api-docs", "http://localhost:8080/v3/api-docs");
        response.put("endpoints", Map.of(
            "applicants", "/api/applicants",
            "loan-applications", "/api/loan-applications",
            "loans", "/api/loans",
            "payments", "/api/payments"
        ));
        return response;
    }
}