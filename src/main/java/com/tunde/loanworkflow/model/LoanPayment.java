package com.tunde.loanworkflow.model;

public class LoanPayment {

    private int id;
    private int loanId;
    private int applicantId;
    private double amountPaid;
    private String paidAt;
    private double remainingBalance;

    public LoanPayment(int loanId, int applicantId, double amountPaid) {
        this.loanId = loanId;
        this.applicantId = applicantId;
        this.amountPaid = amountPaid;
    }

    public LoanPayment(int id, int loanId, int applicantId, double amountPaid,
                       double remainingBalance, String paidAt) {
        this.id = id;
        this.loanId = loanId;
        this.applicantId = applicantId;
        this.amountPaid = amountPaid;
        this.remainingBalance = remainingBalance;
        this.paidAt = paidAt;
    }

    public int getId() {
        return id;
    }

    public int getLoanId() {
        return loanId;
    }

    public int getApplicantId() {
        return applicantId;
    }

    public double getAmountPaid() {
        return amountPaid;
    }

    public String getPaidAt() {
        return paidAt;
    }

    public double getRemainingBalance() {
        return remainingBalance;
    }

    public void setRemainingBalance(double remainingBalance) {
        this.remainingBalance = remainingBalance;
    }

    @Override
    public String toString() {
        return "LoanPayment{" +
                "id=" + id +
                ", loanId=" + loanId +
                ", applicantId=" + applicantId +
                ", amountPaid=" + amountPaid +
                ", remainingBalance=" + remainingBalance +
                ", paidAt='" + paidAt + '\'' +
                '}';
    }
}