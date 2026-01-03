package com.tunde.loanworkflow;

import org.junit.jupiter.api.*;

import com.tunde.loanworkflow.dto.ApplicantRequest;
import com.tunde.loanworkflow.dto.LoanApplicationRequest;
import com.tunde.loanworkflow.enums.LoanStatus;
import com.tunde.loanworkflow.model.Applicant;
import com.tunde.loanworkflow.model.Loan;
import com.tunde.loanworkflow.model.LoanApplication;
import com.tunde.loanworkflow.model.LoanPayment;
import com.tunde.loanworkflow.service.LoanService;
import com.tunde.loanworkflow.exception.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class LoanServiceTest {

    private static LoanService loanService;
    private static int testApplicantId;
    private static Connection conn;

    @BeforeAll
    public static void setup() throws Exception {
        conn = DriverManager.getConnection("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1");

        Statement stmt = conn.createStatement();

        stmt.execute("CREATE TABLE applicants (" +
                "id INT AUTO_INCREMENT PRIMARY KEY, " +
                "name VARCHAR(255), " +
                "email VARCHAR(255), " +
                "account_balance DOUBLE, " +
                "approved_loan_amount DOUBLE, " +
                "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

        stmt.execute("CREATE TABLE Loan_Application (" +
                "id INT AUTO_INCREMENT PRIMARY KEY, " +
                "applicant_id INT, " +
                "applicant_name VARCHAR(100) NOT NULL, " +
                "requested_amount DOUBLE, " +
                "approved_amount DOUBLE, " +
                "remaining_balance DOUBLE, " +
                "fully_paid BOOLEAN, " +
                "status VARCHAR(50), " +
                "applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                "approved_at TIMESTAMP NULL)");

        stmt.execute("CREATE TABLE loan (" +
                "id INT AUTO_INCREMENT PRIMARY KEY, " +
                "applicant_id INT, " +
                "applicant_name VARCHAR(255), " +
                "loan_application_id INT, " +
                "loan_amount DOUBLE, " +
                "status VARCHAR(50) DEFAULT 'ACTIVE', " +
                "issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

        stmt.execute("CREATE TABLE loan_payment (" +
                "id INT AUTO_INCREMENT PRIMARY KEY, " +
                "loan_id INT, " +
                "applicant_id INT, " +
                "amount_paid DOUBLE, " +
                "remaining_balance DOUBLE, " +
                "paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

        loanService = new LoanService(conn);

        ApplicantRequest applicantRequest = new ApplicantRequest("Test User", "test@example.com", 50000.0);
        LoanMessage result = loanService.addApplicant(applicantRequest);
        Applicant testApplicant = (Applicant) result.getData();
        testApplicantId = testApplicant.getId();
    }

    @Test
    @Order(1)
    public void testApplyAndApproveFullLoan() {
        // Use DTO instead of model
        LoanApplicationRequest request = new LoanApplicationRequest("Test User", 1000.0);
        LoanMessage applyResult = loanService.applyForLoan(testApplicantId, request);
        LoanApplication loan = (LoanApplication) applyResult.getData();
        int loanAppId = loan.getApplicationId();

        loanService.updateLoanStatus(loanAppId, LoanStatus.APPROVED);

        LoanApplication fetchedLoan = loanService.getLoanApplicationById(loanAppId);
        double expectedAmount = 1000.0 + loanService.calculateInterest(1000.0);

        assertEquals("APPROVED", fetchedLoan.getStatus());
        assertEquals(expectedAmount, fetchedLoan.getApprovedAmount(), 0.001);
        assertEquals(expectedAmount, fetchedLoan.getRemainingBalance(), 0.001);
        assertFalse(fetchedLoan.isFullyPaid());
    }

    @Test
    @Order(2)
    public void testPartialApproval() {
        LoanApplicationRequest request = new LoanApplicationRequest("Test User", 2000.0);
        LoanMessage applyResult = loanService.applyForLoan(testApplicantId, request);
        LoanApplication loan = (LoanApplication) applyResult.getData();
        int loanAppId = loan.getApplicationId();

        double partialApproved = 1500.0;
        loanService.updateLoanStatus(loanAppId, LoanStatus.APPROVED, partialApproved);

        LoanApplication fetchedLoan = loanService.getLoanApplicationById(loanAppId);
        double expectedAmount = partialApproved + loanService.calculateInterest(partialApproved);

        assertEquals("APPROVED", fetchedLoan.getStatus());
        assertEquals(expectedAmount, fetchedLoan.getApprovedAmount(), 0.001);
        assertEquals(expectedAmount, fetchedLoan.getRemainingBalance(), 0.001);
    }

    @Test
    @Order(3)
    public void testLoanRejection() {
        LoanApplicationRequest request = new LoanApplicationRequest("Test User", 500.0);
        LoanMessage applyResult = loanService.applyForLoan(testApplicantId, request);
        LoanApplication loan = (LoanApplication) applyResult.getData();
        int loanAppId = loan.getApplicationId();

        loanService.updateLoanStatus(loanAppId, LoanStatus.REJECTED);

        LoanApplication fetchedLoan = loanService.getLoanApplicationById(loanAppId);

        assertEquals("REJECTED", fetchedLoan.getStatus());
        assertEquals(0.0, fetchedLoan.getApprovedAmount());
        assertEquals(0.0, fetchedLoan.getRemainingBalance());
    }

    @Test
    @Order(4)
    public void testGetAllLoansForApplicant() {
        List<LoanApplication> loans = loanService.getApplicationsByApplicant(testApplicantId);
        assertTrue(loans.size() >= 3);
    }

    @Test
    @Order(5)
    public void testApprovedLoanStoredInLoanTable() {
        LoanApplicationRequest request = new LoanApplicationRequest("Test User", 3000.0);
        LoanMessage applyResult = loanService.applyForLoan(testApplicantId, request);
        LoanApplication loan = (LoanApplication) applyResult.getData();
        int loanAppId = loan.getApplicationId();

        double approvedAmount = 2500.0;
        loanService.updateLoanStatus(loanAppId, LoanStatus.APPROVED, approvedAmount);

        List<Loan> storedLoans = loanService.getLoansByApplicant(testApplicantId);
        Loan latest = storedLoans.get(storedLoans.size() - 1);

        double expectedAmount = approvedAmount + loanService.calculateInterest(approvedAmount);

        assertFalse(storedLoans.isEmpty(), "No approved loans found in loan table");
        assertEquals(testApplicantId, latest.getApplicantId());
        assertEquals(loanAppId, latest.getLoanApplicationId());
        assertEquals(expectedAmount, latest.getLoanAmount(), 0.001);
        assertEquals("ACTIVE", latest.getStatus());
    }

    @Test
    @Order(6)
    public void testGetLoansByApplicant() {
        List<Loan> loans = loanService.getLoansByApplicant(testApplicantId);
        assertTrue(loans.size() >= 2);
    }

    @Test
    @Order(7)
    public void testGetAllLoans() {
        List<Loan> allLoans = loanService.getAllLoans();
        assertNotNull(allLoans);
        assertTrue(allLoans.size() >= 2, "Loan table should contain multiple approved loans");
    }

    @Test
    @Order(8)
    public void testMakePartialLoanPayment() {
        List<Loan> approvedLoans = loanService.getLoansByApplicant(testApplicantId);
        assertFalse(approvedLoans.isEmpty());
        int loanId = approvedLoans.get(0).getId();

        double paymentAmount = 400.0;
        LoanMessage paymentResult = loanService.makeLoanPayment(loanId, paymentAmount);
        LoanPayment payment = (LoanPayment) paymentResult.getData();

        assertNotNull(payment);
        assertEquals(paymentAmount, payment.getAmountPaid());
        assertTrue(payment.getRemainingBalance() < approvedLoans.get(0).getLoanAmount());

        LoanApplication loanApp = loanService.getLoanApplicationById(approvedLoans.get(0).getLoanApplicationId());
        assertEquals(loanApp.getRemainingBalance(), payment.getRemainingBalance());
        assertFalse(loanApp.isFullyPaid());
    }

    @Test
    @Order(9)
    public void testMakeFullLoanPayment() {
        List<Loan> approvedLoans = loanService.getLoansByApplicant(testApplicantId);
        int loanId = approvedLoans.get(0).getId();
        LoanApplication loanApp = loanService.getLoanApplicationById(approvedLoans.get(0).getLoanApplicationId());

        double remaining = loanApp.getRemainingBalance();
        LoanMessage paymentResult = loanService.makeLoanPayment(loanId, remaining);
        LoanPayment payment = (LoanPayment) paymentResult.getData();

        assertNotNull(payment);
        assertEquals(0.0, payment.getRemainingBalance(), 0.001);

        loanApp = loanService.getLoanApplicationById(approvedLoans.get(0).getLoanApplicationId());
        assertEquals(0.0, loanApp.getRemainingBalance(), 0.001);
        assertTrue(loanApp.isFullyPaid());

        List<LoanPayment> payments = loanService.getPaymentsByLoan(loanId);
        double totalPaid = payments.stream().mapToDouble(LoanPayment::getAmountPaid).sum();
        assertEquals(loanApp.getApprovedAmount(), totalPaid, 0.001);
    }

    @Test
    @Order(10)
    public void testGetPaymentsByApplicant() {
        List<LoanPayment> payments = loanService.getPaymentsByApplicant(testApplicantId);
        assertFalse(payments.isEmpty());
        for (LoanPayment p : payments) {
            assertEquals(testApplicantId, p.getApplicantId());
        }
    }

    @Test
    @Order(11)
    public void testGetAllPayments() {
        List<LoanPayment> allPayments = loanService.getAllPayments();
        assertNotNull(allPayments);
        assertTrue(allPayments.size() > 0);
    }

    @Test
    @Order(12)
    public void testOverPaymentHandled() {
        LoanApplicationRequest request = new LoanApplicationRequest("Test User", 500.0);
        LoanMessage applyResult = loanService.applyForLoan(testApplicantId, request);
        LoanApplication loan = (LoanApplication) applyResult.getData();
        int loanAppId = loan.getApplicationId();

        loanService.updateLoanStatus(loanAppId, LoanStatus.APPROVED);

        List<Loan> approvedLoans = loanService.getLoansByApplicant(testApplicantId);
        int freshLoanId = approvedLoans.get(approvedLoans.size() - 1).getId();

        LoanMessage paymentResult = loanService.makeLoanPayment(freshLoanId, 10000.0);
        LoanPayment payment = (LoanPayment) paymentResult.getData();

        assertNotNull(payment, "LoanPayment should not be null");
        assertEquals(0.0, payment.getRemainingBalance(), 0.001);
    }
}