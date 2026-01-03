package com.tunde.loanworkflow.dto;

public class LoanPaymentRequest {
    private double amount;

    public LoanPaymentRequest() {}

    public LoanPaymentRequest(double amount) {
        this.amount = amount;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }
}