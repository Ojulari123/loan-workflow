package com.work.loanworkflow.model;

/**
 * A single row of an amortization schedule (a read-only projection).
 *
 * <p>This is never persisted and never enforced: it is a forecast of how a
 * fully-amortized loan would draw down to zero over its term. Borrowers may
 * still pay early or in flexible amounts.</p>
 */
public record AmortizationEntry(
        int paymentNumber,
        double paymentAmount,
        double principalPortion,
        double interestPortion,
        double remainingBalance
) {
}
