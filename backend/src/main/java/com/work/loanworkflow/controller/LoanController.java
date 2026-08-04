package com.work.loanworkflow.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import com.work.loanworkflow.model.Loan;
import com.work.loanworkflow.service.LoanService;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
@Tag(name = "Loans", description = "Endpoints for managing approved and active loans")
public class LoanController {
    
    private final LoanService loanService;

    public LoanController() {
        this.loanService = new LoanService();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get loan by Loan ID", description = "Retrieves detailed information about a specific approved loan including amount and status")
    public Loan getLoan(@PathVariable int id) {
        return loanService.getLoanById(id);
    }

    @GetMapping
    @Operation(summary = "Get all loans", description = "Retrieves a list of all approved loans in the system, ordered by issue date (newest first)")
    public List<Loan> getAllLoans() {
        return loanService.getAllLoans();
    }

    @GetMapping("/applicant/{applicantId}")
    @Operation(summary = "Get loans by applicant", description = "Retrieves all approved loans (both ACTIVE and PAID-OFF) for a specific applicant")
    public List<Loan> getLoansByApplicant(@PathVariable int applicantId) {
        return loanService.getLoansByApplicant(applicantId);
    }
}