package com.work.loanworkflow.service;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import com.work.loanworkflow.config.DBConnection;
import com.work.loanworkflow.dto.ApplicantRequest;
import com.work.loanworkflow.dto.LoanApplicationRequest;
import com.work.loanworkflow.dto.LoanPaymentRequest;
import com.work.loanworkflow.enums.LoanStatus;
import com.work.loanworkflow.exception.*;
import com.work.loanworkflow.model.AmortizationEntry;
import com.work.loanworkflow.model.Applicant;
import com.work.loanworkflow.model.Loan;
import com.work.loanworkflow.model.LoanApplication;
import com.work.loanworkflow.model.LoanPayment;

public class LoanService {
    private Connection conn;

    public LoanService() {
        conn = DBConnection.getConnection();
    }

    public LoanService(Connection connection) {
        this.conn = connection;
    }

    // ==================== APPLICANTS ====================
    public LoanMessage addApplicant(ApplicantRequest request) { //Add an applicant using ApplicantRequest DTO
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new LoanException("Name is required.");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new LoanException("Email is required.");
        }
        if (request.getAccountBalance() <= 0) {
            throw new LoanException("Account balance must be greater than 0");
        }
        if (!request.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new LoanException("Invalid email format.");
        } 
        String sql = "INSERT INTO applicants (name, email, account_balance, approved_loan_amount, annual_income, monthly_debt, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, request.getName());
            stmt.setString(2, request.getEmail());
            stmt.setDouble(3, request.getAccountBalance());
            stmt.setDouble(4, 0); // New applicants start with 0 approved loan amount
            stmt.setDouble(5, request.getAnnualIncome());
            stmt.setDouble(6, request.getMonthlyDebt());
            stmt.setString(7, request.getEmploymentStatus());
            stmt.executeUpdate();

            ResultSet keys = stmt.getGeneratedKeys();
            if (keys.next()) {
                int generatedId = keys.getInt(1);
                Applicant applicant = getApplicantById(generatedId);
                return new LoanMessage("Applicant added successfully: " + applicant.getName(), applicant);
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        return null;
    }

    public Applicant getApplicantById(int id) { //Retrieve a specific applicant by ID
        String sql = "SELECT * FROM applicants WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToApplicant(rs);
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        return null;
    }

    public List<Applicant> getAllApplicants() { //List all applicants
        List<Applicant> applicants = new ArrayList<>();
        String sql = "SELECT * FROM applicants";
        try (Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery(sql);
            while (rs.next()) {
                applicants.add(mapResultSetToApplicant(rs));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        return applicants;
    }

    private Applicant mapResultSetToApplicant(ResultSet rs) throws SQLException { //Map ResultSet to Applicant object
        Applicant applicant = new Applicant(
                rs.getInt("id"),
                rs.getString("name"),
                rs.getString("email"),
                rs.getDouble("account_balance"),
                rs.getDouble("approved_loan_amount"),
                rs.getString("created_at")
        );
        applicant.setAnnualIncome(rs.getDouble("annual_income"));   // 0.0 when SQL NULL
        applicant.setMonthlyDebt(rs.getDouble("monthly_debt"));     // 0.0 when SQL NULL
        applicant.setEmploymentStatus(rs.getString("employment_status")); // null when SQL NULL
        return applicant;
    }

    // ==================== LOAN APPLICATIONS ====================
    public LoanMessage applyForLoan(int applicantId, LoanApplicationRequest request) { //Apply for a loan using LoanApplicationRequest DTO
        Applicant app = getApplicantById(applicantId);
        if (app == null) {
            throw new LoanException("Applicant not found!");
        }
        if(request == null){
            throw new LoanException("Input required details");
        }
        int termMonths = request.getTermMonths();
        if (termMonths != 12 && termMonths != 24 && termMonths != 36 && termMonths != 48) {
            throw new LoanException("Invalid loan term: " + termMonths + ". Allowed terms (months): 12, 24, 36, 48.");
        }

        String sql = "INSERT INTO Loan_Application (applicant_id, applicant_name, requested_amount, approved_amount, remaining_balance, fully_paid, loan_purpose, term_months) VALUES (?, ?, ?, 0, 0, FALSE, ?, ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, applicantId);
            stmt.setString(2, app.getName());
            stmt.setDouble(3, request.getAmountRequested());
            stmt.setString(4, request.getLoanPurpose()); // null when not supplied (backward-compatible)
            stmt.setInt(5, termMonths);
            stmt.executeUpdate();

            ResultSet keys = stmt.getGeneratedKeys();
            if (keys.next()) {
                int generatedLoanId = keys.getInt(1);
                LoanApplication loan = getLoanApplicationById(generatedLoanId);
                return new LoanMessage("Loan application submitted. Loan ID: " + generatedLoanId, loan);
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        return null;
    }

    public LoanApplication getLoanApplicationById(int id) { //Retrieve loan application by ID
        String sql = "SELECT * FROM Loan_Application WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return mapResultSetToLoan(rs);
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        throw new LoanException("Loan application not found with ID: " + id);
    }

    public List<LoanApplication> getAllLoanApplications() { //Retrieve all loan applications
        List<LoanApplication> list = new ArrayList<>();
        String sql = "SELECT * FROM Loan_Application";
        try (Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery(sql);
            while (rs.next()) {
                list.add(mapResultSetToLoan(rs));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No applications found");
        }
        return list;
    }

    public List<LoanApplication> getApplicationsByApplicant(int applicantId) { //Retrieve all loan applications for a specific applicant
        List<LoanApplication> list = new ArrayList<>();
        String sql = "SELECT * FROM Loan_Application WHERE applicant_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, applicantId);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(mapResultSetToLoan(rs));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No applications found for applicant ID: " + applicantId);
        }
        return list;
    }

    // ==================== UPDATE LOAN STATUS ====================

    public LoanMessage updateLoanStatus(int applicationId, LoanStatus status, double approvedAmount) { //Updates loan status and approved amount
        LoanApplication loanApp = getLoanApplicationById(applicationId);

        Applicant app = getApplicantById(loanApp.getApplicantId()); 
        if (app == null) {
            throw new LoanException("Applicant not found!");
        }

        String newStatus = status.name();

        if (newStatus.equalsIgnoreCase("REJECTED")) {
            approvedAmount = 0;
        } else if (newStatus.equalsIgnoreCase("APPROVED")) {
            // approvedAmount stays as the approved principal P. The amount-to-repay is the
            // amortized total (monthly payment * term) applied as the remaining balance by
            // recordApprovedLoan(...); this replaces the old simple-interest total.
        }

        String sql = "UPDATE Loan_Application SET status = ?, approved_amount = ?, remaining_balance = ?, fully_paid = FALSE, approved_at = NOW() WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, newStatus);
            stmt.setDouble(2, approvedAmount);
            stmt.setDouble(3, approvedAmount);
            stmt.setInt(4, applicationId);

            int rowsUpdated = stmt.executeUpdate();
            if (rowsUpdated > 0) {
                LoanApplication updatedLoan = getLoanApplicationById(applicationId);

                if (newStatus.equalsIgnoreCase("APPROVED")) {
                    recordApprovedLoan(updatedLoan);
                }

                int applicantId = updatedLoan.getApplicantId();
                double totalApproved = calculateTotalApprovedLoans(applicantId);
                updateApplicantApprovedLoan(applicantId, totalApproved);
                

                return new LoanMessage(
                    "Loan updated:\n" +
                    "Status = " + newStatus + "\n" +
                    "Approved = " + approvedAmount + "\n" +
                    "(All Approved loans are subject to 2.5% -> 5% interest)\n" +
                    "Loan Details:\n" + updatedLoan
                );
            } else {
                throw new LoanException("No loan found with ID: " + applicationId);
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
    }

    public LoanMessage updateLoanStatus(int applicationId, LoanStatus status) { //Updates the status using the requested amount as the approved amount
        double requestedAmount = getRequestedAmount(applicationId);
        return updateLoanStatus(applicationId, status, requestedAmount);
    }

    // ==================== LOANS ====================

    public List<Loan> getLoansByApplicant(int applicantId) {
        Applicant applicant = getApplicantById(applicantId);
        if (applicant == null) {
            throw new LoanException("Applicant not found with ID: " + applicantId);
        }
    
        List<Loan> list = new ArrayList<>();
        String sql = "SELECT * FROM loan WHERE applicant_id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, applicantId);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(new Loan(
                        rs.getInt("id"),
                        rs.getInt("applicant_id"),
                        rs.getString("applicant_name"),
                        rs.getInt("loan_application_id"),
                        rs.getDouble("loan_amount"),
                        rs.getString("status"),
                        rs.getString("issued_at")
                ));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No loans found for applicant ID: " + applicantId);
        }
        return list;
    }

    public Loan getLoanById(int loanId) { //Retrieve a specific loan by ID
        String sql = "SELECT * FROM loan WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, loanId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return new Loan(
                        rs.getInt("id"),
                        rs.getInt("applicant_id"),
                        rs.getString("applicant_name"),
                        rs.getInt("loan_application_id"),
                        rs.getDouble("loan_amount"),
                        rs.getString("status"),
                        rs.getString("issued_at")
                );
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        return null;
    }

    public List<Loan> getAllLoans() { //Retrieve all loans
        List<Loan> list = new ArrayList<>();
        String sql = "SELECT * FROM loan ORDER BY issued_at DESC";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(new Loan(
                        rs.getInt("id"),
                        rs.getInt("applicant_id"),
                        rs.getString("applicant_name"),
                        rs.getInt("loan_application_id"),
                        rs.getDouble("loan_amount"),
                        rs.getString("status"),
                        rs.getString("issued_at")
                ));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No loans found");
        }
        return list;
    }

    // ==================== LOAN PAYMENTS ====================
//Alr has just make it show on swagger
    public LoanMessage makeLoanPayment(int loanId, LoanPaymentRequest request) { //Make a loan payment using LoanPaymentRequest DTO
        return makeLoanPayment(loanId, request.getAmount());
    }

    public LoanMessage makeLoanPayment(int loanId, double paymentAmount) { //Make a loan payment with direct amount
        try {
            if (paymentAmount <= 0) {
                throw new LoanException("Payment amount must be greater than zero.");
            }

            Loan loan = getLoanById(loanId);
            if (loan == null) {
                throw new LoanException("Loan not found.");
            }

            int applicationId = loan.getLoanApplicationId();
            int applicantId = loan.getApplicantId();

            LoanApplication app = getLoanApplicationById(applicationId);
            double remaining = app.getRemainingBalance();

            if (remaining <= 0) {
                throw new LoanException("Loan already fully paid.");
            }

            Applicant applicant = getApplicantById(applicantId);
            double accountBalance = applicant.getAccountBalance();

            if (paymentAmount > accountBalance) {
                throw new LoanException("Payment failed: Amount (" + paymentAmount +
                        ") exceeds account balance (" + accountBalance + ")");
            }

            double actualPayment = Math.min(paymentAmount, remaining);
            double newBalance = remaining - paymentAmount;
            if (newBalance < 0) newBalance = 0;

            String sql = "INSERT INTO loan_payment (loan_id, applicant_id, amount_paid, remaining_balance) VALUES (?, ?, ?, ?)";
            int paymentId = 0;

            try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                stmt.setInt(1, loanId);
                stmt.setInt(2, applicantId);
                stmt.setDouble(3, paymentAmount);
                stmt.setDouble(4, newBalance);
                stmt.executeUpdate();

                ResultSet keys = stmt.getGeneratedKeys();
                if (keys.next()) {
                    paymentId = keys.getInt(1);
                }
            }

            updateRemainingBalance(applicationId, newBalance);

            double updatedAccountBalance = accountBalance - paymentAmount;
            updateApplicantAccountBalance(applicantId, updatedAccountBalance);

            LoanPayment payment = fetchLoanPaymentById(paymentId);
            String message;

            if (newBalance == 0) {
                markLoanAsPaidOff(loanId, applicationId);
                message = "Loan fully paid off!";
            } else if (actualPayment < paymentAmount) {
                message = "Note: Payment adjusted from " + paymentAmount + " to " + actualPayment + " (remaining loan balance). New balance: " + newBalance;
            } else {
                message = "Payment recorded. Remaining balance: " + newBalance;
            }

            return new LoanMessage(message, payment);

        } catch (SQLException e) {
            e.printStackTrace();
            throw new LoanException("Database error during payment: " + e.getMessage());
        }
    }

    public List<LoanPayment> getPaymentsByLoan(int loanId) { //Get payments by loan ID
        List<LoanPayment> list = new ArrayList<>();
        String sql = "SELECT * FROM Loan_Payment WHERE loan_id = ? ORDER BY paid_at ASC";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, loanId);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(new LoanPayment(
                        rs.getInt("id"),
                        rs.getInt("loan_id"),
                        rs.getInt("applicant_id"),
                        rs.getDouble("amount_paid"),
                        rs.getDouble("remaining_balance"),
                        rs.getString("paid_at")
                ));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No payments found for loan ID: " + loanId);
        }
        return list;
    }

    public List<LoanPayment> getAllPayments() { //Retrieve all loan payments
        List<LoanPayment> list = new ArrayList<>();
        String sql = "SELECT * FROM loan_payment ORDER BY paid_at ASC";
        try (Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery(sql);
            while (rs.next()) {
                list.add(new LoanPayment(
                        rs.getInt("id"),
                        rs.getInt("loan_id"),
                        rs.getInt("applicant_id"),
                        rs.getDouble("amount_paid"),
                        rs.getDouble("remaining_balance"),
                        rs.getString("paid_at")
                ));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No payments found");
        }
        return list;
    }

    public List<LoanPayment> getPaymentsByApplicant(int applicantId) { //Retrieve all payments by applicant ID
        List<LoanPayment> list = new ArrayList<>();
        String sql = "SELECT * FROM loan_payment WHERE applicant_id = ? ORDER BY paid_at ASC";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, applicantId);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                list.add(new LoanPayment(
                        rs.getInt("id"),
                        rs.getInt("loan_id"),
                        rs.getInt("applicant_id"),
                        rs.getDouble("amount_paid"),
                        rs.getDouble("remaining_balance"),
                        rs.getString("paid_at")
                ));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        if (list.isEmpty()) {
            throw new LoanException("No payments found for Applicant ID: " + applicantId);
        }
        return list;
    }

    // ==================== HELPER FUNCTIONS ====================

    public double calculateInterest(double amount) { //Calculate interest based on loan amount
        if (amount <= 10000) {
            return amount * 0.025;
        } else if (amount <= 50000) {
            return amount * 0.05;
        } else {
            return amount * 0.075;
        }
    }

    /**
     * Annual interest rate (as a fraction, e.g. 0.05 for 5%) for a principal, derived from the
     * existing product tier method {@link #calculateInterest(double)} so tiers live in one place.
     */
    public double getAnnualRate(double principal) {
        if (principal <= 0) {
            return 0.0;
        }
        return calculateInterest(principal) / principal;
    }

    /**
     * Fully-amortized monthly payment: M = P * r / (1 - (1+r)^-n), where r = annualRate / 12.
     * Guards r == 0 (M = P/n) and non-positive term. Rounded to cents.
     */
    public double computeMonthlyPayment(double principal, double annualRate, int termMonths) {
        if (termMonths <= 0) {
            return 0.0;
        }
        double r = annualRate / 12.0;
        double m;
        if (r == 0.0) {
            m = principal / termMonths;
        } else {
            m = principal * r / (1 - Math.pow(1 + r, -termMonths));
        }
        return round2(m);
    }

    /**
     * Build the amortization schedule (a read-only projection; never enforced). For k = 1..n:
     * interest_k = round(balance * r), principal_k = round(M - interest_k), balance -= principal_k.
     * The final row absorbs rounding so the ending balance is exactly 0.
     */
    public List<AmortizationEntry> computeAmortizationSchedule(double principal, double annualRate, int termMonths) {
        List<AmortizationEntry> schedule = new ArrayList<>();
        if (termMonths <= 0 || principal <= 0) {
            return schedule;
        }
        double r = annualRate / 12.0;
        double monthly = computeMonthlyPayment(principal, annualRate, termMonths);
        double balance = principal;
        for (int k = 1; k <= termMonths; k++) {
            double interest = round2(balance * r);
            double principalPortion;
            double payment;
            if (k == termMonths) {
                // Last row absorbs residual rounding: clear the remaining balance exactly.
                principalPortion = round2(balance);
                payment = round2(principalPortion + interest);
                balance = 0.0;
            } else {
                principalPortion = round2(monthly - interest);
                balance = round2(balance - principalPortion);
                payment = monthly;
            }
            schedule.add(new AmortizationEntry(k, payment, principalPortion, interest, balance));
        }
        return schedule;
    }

    /**
     * Amortization schedule for an APPROVED application, computed on demand from its approved
     * principal + tier rate + chosen term. Throws for non-approved applications.
     */
    public List<AmortizationEntry> getAmortizationSchedule(int applicationId) {
        LoanApplication app = getLoanApplicationById(applicationId);
        if (!"APPROVED".equalsIgnoreCase(app.getStatus())) {
            throw new LoanException("Amortization schedule is only available for APPROVED applications. Current status: "
                    + app.getStatus());
        }
        double principal = app.getApprovedAmount();
        double annualRate = getAnnualRate(principal);
        return computeAmortizationSchedule(principal, annualRate, app.getTermMonths());
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double getRequestedAmount(int applicationId) { //Get the requested loan amount from DB
        String sql = "SELECT requested_amount FROM Loan_Application WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, applicationId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getDouble("requested_amount");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return 0;
    }

    public void updateApplicantAccountBalance(int applicantId, double newBalance) { //Update applicant's account balance
        String sql = "UPDATE applicants SET account_balance = ? WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setDouble(1, newBalance);
            stmt.setInt(2, applicantId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private LoanApplication mapResultSetToLoan(ResultSet rs) throws SQLException { //Map ResultSet to LoanApplication object
        LoanApplication loan = new LoanApplication(
                rs.getInt("id"),
                rs.getInt("applicant_id"),
                rs.getString("applicant_name"),
                rs.getDouble("requested_amount"),
                rs.getDouble("approved_amount"),
                rs.getDouble("remaining_balance"),
                rs.getBoolean("fully_paid"),
                rs.getString("status"),
                rs.getString("applied_at"),
                rs.getString("approved_at")
        );
        loan.setLoanPurpose(rs.getString("loan_purpose")); // null when SQL NULL
        loan.setTermMonths(rs.getInt("term_months"));
        // Amortized monthly payment computed on read (not persisted). Preview uses the
        // requested amount while pending; once approved, the approved principal is used.
        double principal = loan.getApprovedAmount() > 0 ? loan.getApprovedAmount() : loan.getAmountRequested();
        double annualRate = getAnnualRate(principal);
        loan.setMonthlyPayment(computeMonthlyPayment(principal, annualRate, loan.getTermMonths()));
        return loan;
    }

    private double calculateTotalApprovedLoans(int applicantId) { //Calculate total approved loan amount for an applicant
        String sql = "SELECT SUM(approved_amount) AS total FROM Loan_Application WHERE applicant_id = ? AND status = 'APPROVED'";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, applicantId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return rs.getDouble("total");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return 0;
    }

    private void updateApplicantApprovedLoan(int applicantId, double totalApprovedAmount) { //Update the Applicant table with new total approved loan amount
        String sql = "UPDATE applicants SET approved_loan_amount = ? WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setDouble(1, totalApprovedAmount);
            stmt.setInt(2, applicantId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private void recordApprovedLoan(LoanApplication app) { //Store approved loan in the loan table
        // Amortized total to repay = monthly payment * term, from the approved principal + tier rate.
        double principal = app.getApprovedAmount();
        double annualRate = getAnnualRate(principal);
        double monthly = computeMonthlyPayment(principal, annualRate, app.getTermMonths());
        double totalLoanAmount = round2(monthly * app.getTermMonths());

        String sql = "INSERT INTO loan (applicant_id, applicant_name, loan_application_id, loan_amount) " +
                "VALUES (?, ?, ?, ?)";

        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, app.getApplicantId());
            stmt.setString(2, app.getApplicantName());
            stmt.setInt(3, app.getApplicationId());
            stmt.setDouble(4, totalLoanAmount);
            stmt.executeUpdate();

            updateRemainingBalance(app.getApplicationId(), totalLoanAmount);

            System.out.println("Approved loan recorded. Total = " + totalLoanAmount);
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private void updateRemainingBalance(int applicationId, double amount) { //Update remaining balance for a loan application
        String sql = "UPDATE Loan_Application SET remaining_balance = ? WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setDouble(1, amount);
            stmt.setInt(2, applicationId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private void markLoanAsPaidOff(int loanId, int applicationId) throws SQLException { //Mark loan as completely paid off
        String sql1 = "UPDATE loan SET status = 'PAID-OFF' WHERE id = ?";
        String sql2 = "UPDATE Loan_Application SET fully_paid = TRUE, status = 'PAID-OFF' WHERE id = ?";

        try (PreparedStatement stmt = conn.prepareStatement(sql1)) {
            stmt.setInt(1, loanId);
            stmt.executeUpdate();
        }
        try (PreparedStatement stmt = conn.prepareStatement(sql2)) {
            stmt.setInt(1, applicationId);
            stmt.executeUpdate();
        }
    }

    private LoanPayment fetchLoanPaymentById(int paymentId) { //Retrieve a LoanPayment by payment ID
        String sql = "SELECT * FROM loan_payment WHERE id = ?";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, paymentId);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                return new LoanPayment(
                        rs.getInt("id"),
                        rs.getInt("loan_id"),
                        rs.getInt("applicant_id"),
                        rs.getDouble("amount_paid"),
                        rs.getDouble("remaining_balance"),
                        rs.getString("paid_at")
                );
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }
}