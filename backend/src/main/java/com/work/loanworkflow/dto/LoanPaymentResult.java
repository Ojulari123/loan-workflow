package com.work.loanworkflow.dto;

public class LoanPaymentResult {
    private int id;
    private int loanId;
    private int applicantId;
    private double amountPaid;        // the applied charge (never exceeds the remaining loan balance)
    private double remainingBalance;  // new remaining balance on the loan after this payment
    private double accountBalance;    // applicant's new account balance after being debited
    private String paidAt;

    public LoanPaymentResult(int id, int loanId, int applicantId, double amountPaid,
                             double remainingBalance, double accountBalance, String paidAt) {
        this.id = id;
        this.loanId = loanId;
        this.applicantId = applicantId;
        this.amountPaid = amountPaid;
        this.remainingBalance = remainingBalance;
        this.accountBalance = accountBalance;
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

    public double getRemainingBalance() {
        return remainingBalance;
    }

    public double getAccountBalance() {
        return accountBalance;
    }

    public String getPaidAt() {
        return paidAt;
    }
}
