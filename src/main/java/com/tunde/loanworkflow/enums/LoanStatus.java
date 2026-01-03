package com.tunde.loanworkflow.enums;

public enum LoanStatus {
    REJECTED,
    APPROVED;

    public static LoanStatus fromString(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new IllegalArgumentException("Status cannot be null or empty");
        }
        try {
            return LoanStatus.valueOf(status.toUpperCase().replace("-", "_"));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Invalid status: '" + status + "'. Allowed values: ACTIVE, PENDING, REJECTED, APPROVED, PAID-OFF"
            );
        }
    }
}