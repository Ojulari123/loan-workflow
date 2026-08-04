package com.work.loanworkflow.service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.work.loanworkflow")
public class Main {
    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
        System.out.println("\n===========================================");
        System.out.println("Loan Application REST API is running!");
        System.out.println("Server: http://localhost:8080");
        System.out.println("===========================================\n");
    }
}