package com.tunde.loanworkflow.model;
public class LoanApplication {
    private int applicationId;       
    private int applicantId; 
    private String applicantName;        
    private double amountRequested;
    private double approvedAmount;     
    private double remainingBalance;    
    private boolean fullyPaid;         
    private String status;          
    private String createdAt;       
    private String approvedAt;         

    public LoanApplication() {}

    public LoanApplication(int applicantId, String applicantName, double amountRequested) {
        this.applicantId = applicantId;
        this.applicantName = applicantName;
        this.amountRequested = amountRequested;
        this.status = "PENDING";
        this.approvedAmount = 0.0;
        this.remainingBalance = 0.0;
        this.fullyPaid = false;
    }

    public LoanApplication(int applicationId, int applicantId, String applicantName, double amountRequested, double approvedAmount, 
                           double remainingBalance, boolean fullyPaid, String status, String createdAt, String approvedAt) {
        this.applicationId = applicationId;
        this.applicantId = applicantId;
        this.applicantName = applicantName;
        this.amountRequested = amountRequested;
        this.approvedAmount = approvedAmount;
        this.remainingBalance = remainingBalance;
        this.fullyPaid = fullyPaid;
        this.status = status;
        this.createdAt = createdAt;
        this.approvedAt = approvedAt;
    }

    public int getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(int applicationId) {
        this.applicationId = applicationId;
    }

    public int getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(int applicantId) {
        this.applicantId = applicantId;
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

    public double getApprovedAmount() {
        return approvedAmount;
    }

    public void setApprovedAmount(double approvedAmount) {
        this.approvedAmount = approvedAmount;
        this.remainingBalance = approvedAmount;
    }

    public double getRemainingBalance() {
        return remainingBalance;
    }

    public void setRemainingBalance(double remainingBalance) {
        this.remainingBalance = remainingBalance;
    }

    public boolean isFullyPaid() {
        return fullyPaid;
    }

    public void setFullyPaid(boolean fullyPaid) {
        this.fullyPaid = fullyPaid;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public String getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(String approvedAt) {
        this.approvedAt = approvedAt;
    }

    @Override
    public String toString() {
        return "LoanApplication{" +
                "applicationId=" + applicationId +
                ", applicantId=" + applicantId +
                ", amountRequested=" + amountRequested +
                ", approvedAmount=" + approvedAmount +
                ", remainingBalance=" + remainingBalance +
                ", fullyPaid=" + fullyPaid +
                ", status='" + status + '\'' +
                ", createdAt='" + createdAt + '\'' +
                ", approvedAt='" + approvedAt + '\'' +
                '}';
    }
}