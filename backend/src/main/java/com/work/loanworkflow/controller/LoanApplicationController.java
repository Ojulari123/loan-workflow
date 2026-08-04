package com.work.loanworkflow.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.work.loanworkflow.dto.LoanApplicationRequest;
import com.work.loanworkflow.enums.LoanStatus;
import com.work.loanworkflow.exception.*;
import com.work.loanworkflow.model.CreditAssessment;
import com.work.loanworkflow.model.LoanApplication;
import com.work.loanworkflow.service.AiUnderwritingService;
import com.work.loanworkflow.service.LoanService;

import java.util.List;

@RestController
@RequestMapping("/api/loan-applications")
@Tag(name = "Loan Applications", description = "Endpoints for managing loan applications and their approval status")
public class LoanApplicationController {

    private final LoanService loanService;
    private final AiUnderwritingService aiUnderwritingService;

    public LoanApplicationController() {
        this.loanService = new LoanService();
        this.aiUnderwritingService = new AiUnderwritingService();
    }

    @PostMapping("/applicant/{applicantId}")
    @Operation(summary = "Apply for a loan", description = "Submit a new loan application with the requested amount. Application status will be set to PENDING.")
    public LoanMessage applyForLoan(@PathVariable int applicantId, @RequestBody LoanApplicationRequest request) {
        return loanService.applyForLoan(applicantId, request);
    }

    @GetMapping("/{applicationId}")
    @Operation(summary = "Get loan application by ApplicationID", description = "Retrieves detailed information about a specific loan application including status and amounts")
    public LoanApplication getLoanApplication(@PathVariable int applicationId) {
        return loanService.getLoanApplicationById(applicationId);
    }

    @GetMapping
    @Operation(summary = "Get all loan applications", description = "Retrieves a list of all loan applications in the system regardless of status")
    public List<LoanApplication> getAllLoanApplications() {
        return loanService.getAllLoanApplications();
    }

    @GetMapping("/applicant/{applicantId}")
    @Operation(summary = "Get applications by applicant", description = "Retrieves all loan applications submitted by a specific applicant")
    public List<LoanApplication> getApplicationsByApplicant(@PathVariable int applicantId) {
        return loanService.getApplicationsByApplicant(applicantId);
    }

    @PutMapping("/{applicationId}/status")
    @Operation(summary = "Update loan application status", description = "Approve, reject, or update the status of a loan application(Allowed statuses: ACTIVE, PENDING, REJECTED, APPROVED, PAID_OFF). For partial approvals, provide the approved amount. Interest will be automatically calculated and added.")
    public LoanMessage updateLoanStatus(
            @PathVariable("applicationId") int applicantId,
            @RequestParam LoanStatus status,
            @RequestParam(required = false) Double approvedAmount) {
        
        if (approvedAmount != null) {
            return loanService.updateLoanStatus(applicantId, status, approvedAmount);
        } else {
            return loanService.updateLoanStatus(applicantId, status);
        }
    }

    @PostMapping("/{applicationId}/ai-assessment")
    @Operation(summary = "AI credit assessment (advisory)", description = "Runs the Claude Sonnet 5 AI underwriter against the application and its applicant's financial profile and returns a structured, explainable CreditAssessment. Advisory only: this does NOT change the loan status. Returns 404 if the application is not found and 502 if the AI service is unavailable.")
    public ResponseEntity<?> aiAssessment(@PathVariable int applicationId) {
        try {
            CreditAssessment assessment = aiUnderwritingService.assess(applicationId);
            return ResponseEntity.ok(assessment);
        } catch (AiUnavailableException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new LoanMessage("AI underwriting unavailable: " + e.getMessage()));
        } catch (LoanException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new LoanMessage(e.getMessage()));
        }
    }
}