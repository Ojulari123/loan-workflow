package com.work.loanworkflow.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import com.work.loanworkflow.exception.LoanMessage;
import com.work.loanworkflow.service.LoanService;

@RestController
@RequestMapping("/api")
@Tag(name = "Admin", description = "Administrative endpoints for demo management")
public class AdminController {

    private final LoanService loanService;

    public AdminController() {
        this.loanService = new LoanService();
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset demo data", description = "Wipes all rows from the applicants, loan_application, loan, and loan_payment tables so the demo starts fresh.")
    public LoanMessage resetDemoData() {
        return loanService.resetDemoData();
    }
}
