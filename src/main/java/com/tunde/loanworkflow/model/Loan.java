package com.tunde.loanworkflow.model;

public class Loan {
    private int id;
    private int applicantId;
    private String applicantName;
    private int loanApplicationId;
    private double loanAmount;
    private String status;
    private String issuedAt;

    public Loan() {}

    public Loan(int applicantId, String applicantName, int loanApplicationId, double loanAmount) {
        this.applicantId = applicantId;
        this.applicantName = applicantName;
        this.loanApplicationId = loanApplicationId;
        this.loanAmount = loanAmount;
        this.status = "ACTIVE";
    }

    public Loan(int id, int applicantId, String applicantName, int loanApplicationId, double loanAmount,
                String status, String issuedAt) {
        this.id = id;
        this.applicantId = applicantId;
        this.applicantName = applicantName;
        this.loanApplicationId = loanApplicationId;
        this.loanAmount = loanAmount;
        this.status = status;
        this.issuedAt = issuedAt;
    }

    public int getId() { 
        return id; 
    }
    public int getApplicantId() { 
        return applicantId; 
    }
    public String getApplicantName() { 
        return applicantName; 
    }
    public int getLoanApplicationId() { 
        return loanApplicationId; 
    }
    public double getLoanAmount() { 
        return loanAmount; 
    }
    public String getStatus() { 
        return status; 
    }
    public String getIssuedAt() { 
        return issuedAt; 
    }

    public void setStatus(String status) { 
        this.status = status; 
    }
}