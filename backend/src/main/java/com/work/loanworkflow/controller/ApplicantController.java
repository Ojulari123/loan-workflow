package com.work.loanworkflow.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import com.work.loanworkflow.dto.ApplicantRequest;
import com.work.loanworkflow.dto.DepositRequest;
import com.work.loanworkflow.exception.*;
import com.work.loanworkflow.model.Applicant;
import com.work.loanworkflow.service.LoanService;

import java.util.List;

@RestController
@RequestMapping("/api/applicants")
@Tag(name = "Applicants", description = "Endpoints for managing loan applicants")
public class ApplicantController {
    
    private final LoanService loanService;

    public ApplicantController() {
        this.loanService = new LoanService();
    }

    @PostMapping
    @Operation(summary = "Add new applicant", description = "Creates a new loan applicant in the system")
    public LoanMessage addApplicant(@RequestBody ApplicantRequest request) {
        return loanService.addApplicant(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get applicant by ID", description = "Retrieves a specific applicant by their ID")
    public Applicant getApplicant(@PathVariable int id) {
        return loanService.getApplicantById(id);
    }

    @GetMapping
    @Operation(summary = "Get all applicants", description = "Retrieves all applicants in the system")
    public List<Applicant> getAllApplicants() {
        return loanService.getAllApplicants();
    }

    @PostMapping("/{applicantId}/deposit")
    @Operation(summary = "Deposit funds", description = "Adds money to an applicant's account balance so they can fund loan payments. Amount must be greater than zero.")
    public LoanMessage deposit(@PathVariable int applicantId, @RequestBody DepositRequest request) {
        return loanService.depositToAccount(applicantId, request.getAmount());
    }
}