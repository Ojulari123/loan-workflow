// package com.tunde.loanworkflow;

// import org.springframework.boot.SpringApplication;
// import org.springframework.boot.autoconfigure.SpringBootApplication;

// import com.tunde.loanworkflow.model.Applicant;
// import com.tunde.loanworkflow.model.Loan;
// import com.tunde.loanworkflow.model.LoanApplication;
// import com.tunde.loanworkflow.model.LoanPayment;
// import com.tunde.loanworkflow.service.LoanService;

// import java.util.List;

// @SpringBootApplication
// public class Main {
//     public static void main(String[] args) {
//         SpringApplication.run(Main.class, args);
//         LoanService loanService = new LoanService();

//         //1. Add a new applicant
//         Applicant applicant = new Applicant("John Doe", "john@example.com", 19000.0, 0);
//         loanService.addApplicant(applicant);
//         System.out.println("Applicant added: " + applicant.getName() + " (ID: " + applicant.getId() + ")");

//         //2. Apply for first loan (Approve full amount)
//         LoanApplication loan1 = new LoanApplication(applicant.getId(), applicant.getName(), 2000.0);
//         int loan1Id = loanService.applyForLoan(loan1);
//         loanService.updateLoanStatus(loan1Id, "APPROVED");

//         //3. Apply for second loan (partial approval)
//         LoanApplication loan2 = new LoanApplication(applicant.getId(), applicant.getName(), 2500.0);
//         int loan2Id = loanService.applyForLoan(loan2);
//         loanService.updateLoanStatus(loan2Id, "APPROVED", 1700.0);

//         //4. Apply for third loan (rejection)
//         LoanApplication loan3 = new LoanApplication(applicant.getId(), applicant.getName(), 1500.0);
//         int loan3Id = loanService.applyForLoan(loan3);
//         loanService.updateLoanStatus(loan3Id, "REJECTED");

//         //5. Display all loans for this applicant
//         System.out.println("\nAll loans for " + applicant.getName() + ":");
//         List<LoanApplication> loans = loanService.getApplicationsByApplicant(applicant.getId());
//         for (LoanApplication la : loans) {
//             System.out.println("Loan ID: " + la.getApplicationId() +
//                     ", Requested: " + la.getAmountRequested() +
//                     ", Approved: " + la.getApprovedAmount() +
//                     ", Remaining: " + la.getRemainingBalance() +
//                     ", Fully Paid: " + la.isFullyPaid() +
//                     ", Status: " + la.getStatus());
//         }

//         //6. Display all applicants
//         System.out.println("\nAll applicants in system:");
//         List<Applicant> allApplicants = loanService.getAllApplicants();
//         for (Applicant a : allApplicants) {
//             System.out.println("Applicant ID: " + a.getId() +
//                     ", Name: " + a.getName() +
//                     ", Email: " + a.getEmail() +
//                     ", Account Balance: " + a.getAccountBalance() +
//                     ", Approved Loan Amount: " + a.getApprovedLoanAmount());
//         }

//         //7. Display approved loans for an applicant
//         System.out.println("\nApproved loans for applicant:");
//         List<Loan> approvedLoans = loanService.getLoansByApplicant(applicant.getId());
//         for (Loan l : approvedLoans) {
//             System.out.println("Loan ID: " + l.getId() +
//                     ", ApplicationID: " + l.getLoanApplicationId() +
//                     ", Amount: " + l.getLoanAmount() +
//                     ", Status: " + l.getStatus() +
//                     ", IssuedAt: " + l.getIssuedAt());
//         }

//         //8. Display ALL loans in the loan table
//         System.out.println("\nAll Loans in loan Table:");
//         List<Loan> allLoans = loanService.getAllLoans();
//         for (Loan l : allLoans) {
//             System.out.println("Loan ID: " + l.getId() +
//                     ", ApplicantID: " + l.getApplicantId() +
//                     ", ApplicationID: " + l.getLoanApplicationId() +
//                     ", Amount: " + l.getLoanAmount() +
//                     ", Status: " + l.getStatus() +
//                     ", IssuedAt: " + l.getIssuedAt());
//         }

//         //9. Demonstrate Loan Payments
//         System.out.println("\nLoan Payments:");

//         if (!approvedLoans.isEmpty()) {
//             Loan loanToPay = approvedLoans.get(0);
//             System.out.println("Making payments for Loan ID: " + loanToPay.getId() +
//                                " (ApplicationID: " + loanToPay.getLoanApplicationId() + ")");

//             double partialPayment = 500.0; //Make a partial payment
//             LoanPayment payment1 = loanService.makeLoanPayment(loanToPay.getId(), partialPayment);
//             System.out.println("Partial payment made: " + payment1.getAmountPaid() +
//                                ", Remaining balance: " + payment1.getRemainingBalance());

//             LoanApplication loanApp = loanService.getLoanApplicationById(loanToPay.getLoanApplicationId()); //Make another payment to pay off the loan
//             double remaining = loanApp.getRemainingBalance();
//             LoanPayment payment2 = loanService.makeLoanPayment(loanToPay.getId(), remaining);
//             System.out.println("Final payment made: " + payment2.getAmountPaid() +
//                                ", Remaining balance: " + payment2.getRemainingBalance());

//             List<LoanPayment> payments = loanService.getPaymentsByLoan(loanToPay.getId()); //Display all payments for this loan
//             System.out.println("\nAll payments for Loan ID: " + loanToPay.getId());
//             for (LoanPayment p : payments) {
//                 System.out.println("Payment ID: " + p.getId() +
//                                    ", Amount Paid: " + p.getAmountPaid() +
//                                    ", Remaining Balance: " + p.getRemainingBalance() +
//                                    ", Paid At: " + p.getPaidAt());
//             }

//             List<LoanPayment> paymentsByApplicant = loanService.getPaymentsByApplicant(applicant.getId()); //Display all payments by this applicant
//             System.out.println("\nAll payments by Applicant ID: " + applicant.getId());
//             for (LoanPayment p : paymentsByApplicant) {
//                 System.out.println("Payment ID: " + p.getId() +
//                                    ", Loan ID: " + p.getLoanId() +
//                                    ", Amount Paid: " + p.getAmountPaid() +
//                                    ", Remaining Balance: " + p.getRemainingBalance() +
//                                    ", Paid At: " + p.getPaidAt());
//             }
//         } else {
//             System.out.println("No approved loans to make payments.");
//         }
//     }
// }

package com.tunde.loanworkflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Main {
    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
        System.out.println("\n===========================================");
        System.out.println("Loan Application REST API is running!");
        System.out.println("Server: http://localhost:8080");
        System.out.println("===========================================\n");
    }
}