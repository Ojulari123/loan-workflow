package com.work.loanworkflow.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import com.work.loanworkflow.dto.LoanPaymentRequest;
import com.work.loanworkflow.exception.*;
import com.work.loanworkflow.model.LoanPayment;
import com.work.loanworkflow.service.LoanService;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@Tag(name = "Loan Payments", description = "Endpoints for processing and tracking loan payments")
public class LoanPaymentController {
    
    private final LoanService loanService;

    public LoanPaymentController() {
        this.loanService = new LoanService();
    }

    @PostMapping("/loan/{loanId}")
    @Operation(summary = "Make a loan payment", description = "Process a payment towards a specific loan. Payment cannot exceed account balance or remaining loan balance. Loan will be marked as PAID-OFF when fully paid.")
    public LoanMessage makePayment(
            @PathVariable int loanId,
            @RequestBody LoanPaymentRequest request) {
        
        return loanService.makeLoanPayment(loanId, request.getAmount());
    }

    @GetMapping("/loan/{loanId}")
    @Operation(summary = "Get payments by loan", description = "Retrieves all payment records for a specific loan, ordered by payment date (oldest first)")
    public List<LoanPayment> getPaymentsByLoan(@PathVariable int loanId) {
        return loanService.getPaymentsByLoan(loanId);
    }

    @GetMapping("/applicant/{applicantId}")
    @Operation(summary = "Get payments by applicant", description = "Retrieves all payment records made by a specific applicant across all their loans")
    public List<LoanPayment> getPaymentsByApplicant(@PathVariable int applicantId) {
        return loanService.getPaymentsByApplicant(applicantId);
    }

    @GetMapping
    @Operation(summary = "Get all payments", description = "Retrieves all payment records in the system, ordered by payment date (oldest first)")
    public List<LoanPayment> getAllPayments() {
        return loanService.getAllPayments();
    }
}