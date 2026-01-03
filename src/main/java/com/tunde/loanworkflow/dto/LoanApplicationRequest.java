package com.tunde.loanworkflow.dto;

public class LoanApplicationRequest {
    private String applicantName;
    private double amountRequested;

    public LoanApplicationRequest() {}

    public LoanApplicationRequest(String applicantName, double amountRequested) {
        this.applicantName = applicantName;
        this.amountRequested = amountRequested;
    }

    public String getApplicantName() {
        return applicantName;
    }

    public void setApplicantName(String applicantName) {
        this.applicantName = applicantName;
    }

    public double getAmountRequested() {
        return amountRequested;
    }

    public void setAmountRequested(double amountRequested) {
        this.amountRequested = amountRequested;
    }
}