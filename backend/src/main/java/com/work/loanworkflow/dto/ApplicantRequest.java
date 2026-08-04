package com.work.loanworkflow.dto;

public class ApplicantRequest {
    private String name;
    private String email;
    private double accountBalance;
    private double annualIncome;
    private double monthlyDebt;
    private String employmentStatus;

    public ApplicantRequest() {}

    public ApplicantRequest(String name, String email, double accountBalance) {
        this.name = name;
        this.email = email;
        this.accountBalance = accountBalance;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public double getAccountBalance() {
        return accountBalance;
    }

    public void setAccountBalance(double accountBalance) {
        this.accountBalance = accountBalance;
    }

    public double getAnnualIncome() {
        return annualIncome;
    }

    public void setAnnualIncome(double annualIncome) {
        this.annualIncome = annualIncome;
    }

    public double getMonthlyDebt() {
        return monthlyDebt;
    }

    public void setMonthlyDebt(double monthlyDebt) {
        this.monthlyDebt = monthlyDebt;
    }

    public String getEmploymentStatus() {
        return employmentStatus;
    }

    public void setEmploymentStatus(String employmentStatus) {
        this.employmentStatus = employmentStatus;
    }
}