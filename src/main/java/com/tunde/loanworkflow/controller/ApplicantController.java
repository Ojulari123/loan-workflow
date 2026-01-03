package com.tunde.loanworkflow.controller;

import com.tunde.loanworkflow.dto.ApplicantRequest;
import com.tunde.loanworkflow.model.Applicant;
import com.tunde.loanworkflow.service.LoanService;
import com.tunde.loanworkflow.exception.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

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
}