package com.tunde.loanworkflow;

import com.tunde.loanworkflow.dto.ApplicantRequest;
import com.tunde.loanworkflow.dto.LoanApplicationRequest;
import com.tunde.loanworkflow.enums.LoanStatus;
import com.tunde.loanworkflow.exception.LoanMessage;
import com.tunde.loanworkflow.model.*;
import com.tunde.loanworkflow.service.LoanService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
public class LoanWorkflowIntegrationTest {

    @Test
    public void testCompleteWorkflow() {
        LoanService loanService = new LoanService();

        // 1. Add a new applicant
        ApplicantRequest applicantRequest = new ApplicantRequest("jay Doe", "jay@example.com", 19000.0);
        LoanMessage applicantResult = loanService.addApplicant(applicantRequest);
        Applicant applicant = (Applicant) applicantResult.getData();
        System.out.println("Applicant added: " + applicant.getName() + " (ID: " + applicant.getId() + ")");

        // 2. Apply for first loan (Approve full amount)
        LoanApplicationRequest loanRequest1 = new LoanApplicationRequest("jay Doe", 2000.0);
        LoanMessage loan1Result = loanService.applyForLoan(applicant.getId(), loanRequest1);
        LoanApplication loan1 = (LoanApplication) loan1Result.getData();
        loanService.updateLoanStatus(loan1.getApplicationId(), LoanStatus.APPROVED);

        // 3. Apply for second loan (partial approval)
        LoanApplicationRequest loanRequest2 = new LoanApplicationRequest("jay Doe", 2500.0);
        LoanMessage loan2Result = loanService.applyForLoan(applicant.getId(), loanRequest2);
        LoanApplication loan2 = (LoanApplication) loan2Result.getData();
        loanService.updateLoanStatus(loan2.getApplicationId(), LoanStatus.APPROVED, 1700.0);

        // 4. Apply for third loan (rejection)
        LoanApplicationRequest loanRequest3 = new LoanApplicationRequest("jay Doe", 1500.0);
        LoanMessage loan3Result = loanService.applyForLoan(applicant.getId(), loanRequest3);
        LoanApplication loan3 = (LoanApplication) loan3Result.getData();
        loanService.updateLoanStatus(loan3.getApplicationId(), LoanStatus.REJECTED);

        // 5. Display all loans for this applicant
        System.out.println("\nAll loans for " + applicant.getName() + ":");
        List<LoanApplication> loans = loanService.getApplicationsByApplicant(applicant.getId());
        for (LoanApplication la : loans) {
            System.out.println("Loan ID: " + la.getApplicationId() +
                    ", Requested: " + la.getAmountRequested() +
                    ", Approved: " + la.getApprovedAmount() +
                    ", Remaining: " + la.getRemainingBalance() +
                    ", Fully Paid: " + la.isFullyPaid() +
                    ", Status: " + la.getStatus());
        }

        // 6. Display all applicants
        System.out.println("\nAll applicants in system:");
        List<Applicant> allApplicants = loanService.getAllApplicants();
        for (Applicant a : allApplicants) {
            System.out.println("Applicant ID: " + a.getId() +
                    ", Name: " + a.getName() +
                    ", Email: " + a.getEmail() +
                    ", Account Balance: " + a.getAccountBalance() +
                    ", Approved Loan Amount: " + a.getApprovedLoanAmount());
        }

        // 7. Display approved loans for an applicant
        System.out.println("\nApproved loans for applicant:");
        List<Loan> approvedLoans = loanService.getLoansByApplicant(applicant.getId());
        for (Loan l : approvedLoans) {
            System.out.println("Loan ID: " + l.getId() +
                    ", ApplicationID: " + l.getLoanApplicationId() +
                    ", Amount: " + l.getLoanAmount() +
                    ", Status: " + l.getStatus() +
                    ", IssuedAt: " + l.getIssuedAt());
        }

        // 8. Display ALL loans in the loan table
        System.out.println("\nAll Loans in loan Table:");
        List<Loan> allLoans = loanService.getAllLoans();
        for (Loan l : allLoans) {
            System.out.println("Loan ID: " + l.getId() +
                    ", ApplicantID: " + l.getApplicantId() +
                    ", ApplicationID: " + l.getLoanApplicationId() +
                    ", Amount: " + l.getLoanAmount() +
                    ", Status: " + l.getStatus() +
                    ", IssuedAt: " + l.getIssuedAt());
        }

        // 9. Demonstrate Loan Payments
        System.out.println("\nLoan Payments:");

        if (!approvedLoans.isEmpty()) {
            Loan loanToPay = approvedLoans.get(0);
            System.out.println("Making payments for Loan ID: " + loanToPay.getId() +
                    " (ApplicationID: " + loanToPay.getLoanApplicationId() + ")");

            // Make a partial payment
            double partialPayment = 500.0;
            LoanMessage paymentResult1 = loanService.makeLoanPayment(loanToPay.getId(), partialPayment);
            LoanPayment payment1 = (LoanPayment) paymentResult1.getData();
            System.out.println("Partial payment made: " + payment1.getAmountPaid() +
                    ", Remaining balance: " + payment1.getRemainingBalance());

            // Make another payment to pay off the loan
            LoanApplication loanApp = loanService.getLoanApplicationById(loanToPay.getLoanApplicationId());
            double remaining = loanApp.getRemainingBalance();
            LoanMessage paymentResult2 = loanService.makeLoanPayment(loanToPay.getId(), remaining);
            LoanPayment payment2 = (LoanPayment) paymentResult2.getData();
            System.out.println("Final payment made: " + payment2.getAmountPaid() +
                    ", Remaining balance: " + payment2.getRemainingBalance());

            // Display all payments for this loan
            List<LoanPayment> payments = loanService.getPaymentsByLoan(loanToPay.getId());
            System.out.println("\nAll payments for Loan ID: " + loanToPay.getId());
            for (LoanPayment p : payments) {
                System.out.println("Payment ID: " + p.getId() +
                        ", Amount Paid: " + p.getAmountPaid() +
                        ", Remaining Balance: " + p.getRemainingBalance() +
                        ", Paid At: " + p.getPaidAt());
            }

            // Display all payments by this applicant
            List<LoanPayment> paymentsByApplicant = loanService.getPaymentsByApplicant(applicant.getId());
            System.out.println("\nAll payments by Applicant ID: " + applicant.getId());
            for (LoanPayment p : paymentsByApplicant) {
                System.out.println("Payment ID: " + p.getId() +
                        ", Loan ID: " + p.getLoanId() +
                        ", Amount Paid: " + p.getAmountPaid() +
                        ", Remaining Balance: " + p.getRemainingBalance() +
                        ", Paid At: " + p.getPaidAt());
            }
        } else {
            System.out.println("No approved loans to make payments.");
        }
    }
}