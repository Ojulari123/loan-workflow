// package com.tunde.loanworkflow.service;
// import java.sql.*;
// import java.util.ArrayList;
// import java.util.List;

// import com.tunde.loanworkflow.config.DBConnection;
// import com.tunde.loanworkflow.model.Applicant;
// import com.tunde.loanworkflow.model.Loan;
// import com.tunde.loanworkflow.model.LoanApplication;
// import com.tunde.loanworkflow.model.LoanPayment;

// public class LoanService {
//     private Connection conn;

//     public LoanService() {
//         conn = DBConnection.getConnection();
//     } // For the real app
//     public LoanService(Connection connection) {
//         this.conn = connection;
//     } // for tests

//     //Applicants
//     public void addApplicant(Applicant applicant) { //Add an appllicant
//         String sql = "INSERT INTO applicants (name, email, account_balance, approved_loan_amount) VALUES (?, ?, ?, ?)";
//         try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
//             stmt.setString(1, applicant.getName());
//             stmt.setString(2, applicant.getEmail());
//             stmt.setDouble(3, applicant.getAccountBalance());
//             stmt.setDouble(4, applicant.getApprovedLoanAmount());
//             stmt.executeUpdate();

//             ResultSet keys = stmt.getGeneratedKeys();
//             if (keys.next()) {
//                 applicant.setId(keys.getInt(1));
//             }
//             System.out.println("Applicant added successfully: " + applicant.getName());
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//     }

//     public Applicant getApplicantById(int id) { //Retrieve a specific applicant by ID
//         String sql = "SELECT * FROM applicants WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, id);
//             ResultSet rs = stmt.executeQuery();
//             if (rs.next()) {
//                 return new Applicant(
//                         rs.getInt("id"),
//                         rs.getString("name"),
//                         rs.getString("email"),
//                         rs.getDouble("account_balance"),
//                         rs.getDouble("approved_loan_amount"),
//                         rs.getString("created_at")
//                 );
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return null;
//     }

//     public List<Applicant> getAllApplicants() { //List all applicants
//         List<Applicant> applicants = new ArrayList<>();
//         String sql = "SELECT * FROM applicants";
//         try (Statement stmt = conn.createStatement()) {
//             ResultSet rs = stmt.executeQuery(sql);
//             while (rs.next()) {
//                 applicants.add(new Applicant(
//                         rs.getInt("id"),
//                         rs.getString("name"),
//                         rs.getString("email"),
//                         rs.getDouble("account_balance"),
//                         rs.getDouble("approved_loan_amount"),
//                         rs.getString("created_at")
//                 ));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return applicants;
//     }

//     //Loan Applications
//     public int applyForLoan(LoanApplication loan) {
//         Applicant app = getApplicantById(loan.getApplicantId());
//         if (app == null) {
//             System.out.println("Applicant not found!");
//             return 0;
//         }
//         loan.setApplicantName(app.getName());

//         String sql = "INSERT INTO Loan_Application (applicant_id, applicant_name, requested_amount, approved_amount, remaining_balance, fully_paid) VALUES (?, ?, ?, 0, 0, FALSE)";
//         int generatedLoanId = 0;
//         try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
//             stmt.setInt(1, loan.getApplicantId());
//             stmt.setString(2, loan.getApplicantName());
//             stmt.setDouble(3, loan.getAmountRequested());
//             stmt.executeUpdate();

//             ResultSet keys = stmt.getGeneratedKeys();
//             if (keys.next()) {
//                 generatedLoanId = keys.getInt(1);
//                 loan.setApplicationId(generatedLoanId);
//                 loan.setStatus("PENDING");
//                 loan.setApprovedAmount(0);
//                 loan.setRemainingBalance(0);
//                 loan.setFullyPaid(false);
//             }
//             System.out.println("Loan application submitted. Loan ID: " + generatedLoanId);
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return generatedLoanId;
//     }

//     public LoanApplication getLoanApplicationById(int id) { //Retrieve loan(s) using ApplicationID
//         String sql = "SELECT * FROM Loan_Application WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, id);
//             ResultSet rs = stmt.executeQuery();
//             if (rs.next()) {
//                 return mapResultSetToLoan(rs);
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return null;
//     }

//     public List<LoanApplication> getAllLoanApplications() { //Retrieve all loans
//         List<LoanApplication> list = new ArrayList<>();
//         String sql = "SELECT * FROM Loan_Application";
//         try (Statement stmt = conn.createStatement()) {
//             ResultSet rs = stmt.executeQuery(sql);
//             while (rs.next()) {
//                 list.add(mapResultSetToLoan(rs));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

//     public List<LoanApplication> getApplicationsByApplicant(int applicantId) { //Retrieve all loans linked to this ApplicantID
//         List<LoanApplication> list = new ArrayList<>();
//         String sql = "SELECT * FROM Loan_Application WHERE applicant_id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, applicantId);
//             ResultSet rs = stmt.executeQuery();
//             while (rs.next()) {
//                 list.add(mapResultSetToLoan(rs));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

//     //Update Loan Status
//     public void updateLoanStatus(int applicationId, String newStatus, double approvedAmount) { //Updates loan status and approved amount of a loan application in the database
//         if (newStatus.equalsIgnoreCase("REJECTED")) {
//             approvedAmount = 0;
//         }
//         else if (newStatus.equalsIgnoreCase("APPROVED")) {
//             approvedAmount += calculateInterest(approvedAmount);
//         }

//         String sql = "UPDATE Loan_Application SET status = ?, approved_amount = ?, remaining_balance = ?, fully_paid = FALSE, approved_at = NOW() WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setString(1, newStatus);
//             stmt.setDouble(2, approvedAmount);
//             stmt.setDouble(3, approvedAmount); 
//             stmt.setInt(4, applicationId);

//             int rowsUpdated = stmt.executeUpdate();
//             if (rowsUpdated > 0) {
//                 LoanApplication updatedLoan = getLoanApplicationById(applicationId);
            
//                 if (newStatus.equalsIgnoreCase("APPROVED")) {
//                     recordApprovedLoan(updatedLoan);
//                 }

//                 int applicantId = updatedLoan.getApplicantId();
//                 double totalApproved = calculateTotalApprovedLoans(applicantId);
//                 updateApplicantApprovedLoan(applicantId, totalApproved);
            
//                 System.out.println("Loan updated: Status = " + newStatus + ", Approved = " + approvedAmount + " " + "(All Approved loans are subject to 2.5% -> 5% interest)");
//             } else {
//                 System.out.println("No loan found with ID: " + applicationId);
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//     }

//     public void updateLoanStatus(int applicationId, String newStatus) { //Updates the status of a loan application using the requested amount as the approved amount
//         double requestedAmount = getRequestedAmount(applicationId);
//         updateLoanStatus(applicationId, newStatus, requestedAmount);
//     }

//     //Loans
//     public List<Loan> getLoansByApplicant(int applicantId) { //Retrieve loan(s) using ApplicantID
//         List<Loan> list = new ArrayList<>();
//         String sql = "SELECT * FROM loan WHERE applicant_id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, applicantId);
//             ResultSet rs = stmt.executeQuery();
//             while (rs.next()) {
//                 list.add(new Loan(
//                     rs.getInt("id"),
//                     rs.getInt("applicant_id"),
//                     rs.getString("applicant_name"),
//                     rs.getInt("loan_application_id"),
//                     rs.getDouble("loan_amount"),
//                     rs.getString("status"),
//                     rs.getString("issued_at")
//                 ));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

//     public Loan getLoanById(int loanId) { //Retrives a specific loan using the loanID for loan payment
//         String sql = "SELECT * FROM loan WHERE id = ?";
    
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, loanId);
//             ResultSet rs = stmt.executeQuery();
    
//             if (rs.next()) {
//                 return new Loan(
//                     rs.getInt("id"),
//                     rs.getInt("applicant_id"),
//                     rs.getString("applicant_name"),
//                     rs.getInt("loan_application_id"),
//                     rs.getDouble("loan_amount"),
//                     rs.getString("status"),
//                     rs.getString("issued_at")
//                 );
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return null;
//     }

//     public List<Loan> getAllLoans() { //Retrieve all loans in the Loan Table
//         List<Loan> list = new ArrayList<>();
//         String sql = "SELECT * FROM loan ORDER BY issued_at DESC";

//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             ResultSet rs = stmt.executeQuery();
//             while (rs.next()) {
//                 list.add(new Loan(
//                         rs.getInt("id"),
//                         rs.getInt("applicant_id"),
//                         rs.getString("applicant_name"),
//                         rs.getInt("loan_application_id"),
//                         rs.getDouble("loan_amount"),
//                         rs.getString("status"),
//                         rs.getString("issued_at")
//                 ));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

//     //loan payments
//     public LoanPayment makeLoanPayment(int loanId, double paymentAmount) {
//         try {
//             if (paymentAmount <= 0) {
//                 System.out.println("Payment amount must be greater than zero.");
//                 return null;
//             }

//             Loan loan = getLoanById(loanId);
//             if (loan == null) {
//                 System.out.println("Loan not found.");
//                 return null;
//             }
    
//             int applicationId = loan.getLoanApplicationId();
//             int applicantId = loan.getApplicantId();
    
//             LoanApplication app = getLoanApplicationById(applicationId);
//             double remaining = app.getRemainingBalance();

//             if (remaining <= 0) {
//                 System.out.println("Loan already fully paid.");
//                 return null;
//             }

//             Applicant applicant = getApplicantById(applicantId);
//             double accountBalance = applicant.getAccountBalance();

//             if (paymentAmount > accountBalance) {
//                 System.out.println("Payment failed: Amount (" + paymentAmount + 
//                              ") exceeds account balance (" + accountBalance + ")");
//                 return null;
//             }

//             double actualPayment = Math.min(paymentAmount, remaining);
//             double newBalance = remaining - paymentAmount;
//             if (newBalance < 0) newBalance = 0;
    
//             String sql = "INSERT INTO loan_payment (loan_id, applicant_id, amount_paid, remaining_balance) VALUES (?, ?, ?, ?)";
    
//             int paymentId = 0;
    
//             try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
//                 stmt.setInt(1, loanId);
//                 stmt.setInt(2, applicantId);
//                 stmt.setDouble(3, paymentAmount);
//                 stmt.setDouble(4, newBalance);
    
//                 stmt.executeUpdate();
    
//                 ResultSet keys = stmt.getGeneratedKeys();
//                 if (keys.next()) {
//                     paymentId = keys.getInt(1);
//                 }
//             }
    
//             updateRemainingBalance(applicationId, newBalance);

//             double updatedAccountBalance = accountBalance - paymentAmount;
//             updateApplicantAccountBalance(applicantId, updatedAccountBalance);

//             if (newBalance == 0) {
//                 markLoanAsPaidOff(loanId, applicationId);
//                 System.out.println("Loan fully paid off!");
//             } else {
//                 System.out.println("Payment recorded. Remaining balance: " + newBalance);
//             }

//             if (actualPayment < paymentAmount) {
//                 System.out.println("Note: Payment adjusted from " + paymentAmount + 
//                                  " to " + actualPayment + " (remaining loan balance)");
//             }
    
//             return fetchLoanPaymentById(paymentId);
    
//         } catch (SQLException e) {
//             System.out.println("Database error during payment: " + e.getMessage());
//             e.printStackTrace();
//             return null;
//         } catch (Exception e) {
//             System.out.println("Unexpected error during payment: " + e.getMessage());
//             e.printStackTrace();
//             return null;
//         }
//     }

//     public List<LoanPayment> getPaymentsByLoan(int loanId) { //Make loan payments using loanID
//         List<LoanPayment> list = new ArrayList<>();
//         String sql = "SELECT * FROM Loan_Payment WHERE loan_id = ? ORDER BY paid_at ASC";
    
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, loanId);
//             ResultSet rs = stmt.executeQuery();
    
//             while (rs.next()) {
//                 list.add(new LoanPayment(
//                         rs.getInt("id"),
//                         rs.getInt("loan_id"),
//                         rs.getInt("applicant_id"),
//                         rs.getDouble("amount_paid"),
//                         rs.getDouble("remaining_balance"),
//                         rs.getString("paid_at")
//                 ));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

    
//     public List<LoanPayment> getAllPayments() {// Retrieves all loan payments
//         List<LoanPayment> list = new ArrayList<>();
//         String sql = "SELECT * FROM loan_payment ORDER BY paid_at ASC";

//         try (Statement stmt = conn.createStatement()) {
//             ResultSet rs = stmt.executeQuery(sql);
//             while (rs.next()) {
//                 list.add(new LoanPayment(
//                         rs.getInt("id"),
//                         rs.getInt("loan_id"),
//                         rs.getInt("applicant_id"),
//                         rs.getDouble("amount_paid"),
//                         rs.getDouble("remaining_balance"),
//                         rs.getString("paid_at")));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

//     public List<LoanPayment> getPaymentsByApplicant(int applicantId) { // Retrieves all payments made by a specific applicantID
//         List<LoanPayment> list = new ArrayList<>();
//         String sql = "SELECT * FROM loan_payment WHERE applicant_id = ? ORDER BY paid_at ASC";

//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, applicantId);
//             ResultSet rs = stmt.executeQuery();
//             while (rs.next()) {
//                 list.add(new LoanPayment(
//                         rs.getInt("id"),
//                         rs.getInt("loan_id"),
//                         rs.getInt("applicant_id"),
//                         rs.getDouble("amount_paid"),
//                         rs.getDouble("remaining_balance"),
//                         rs.getString("paid_at")));
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return list;
//     }

//     //Helper funcs
//     public double calculateInterest(double amount) { //for calculating interest
//         if (amount <= 10000){
//             return amount * 0.025;
//         } 
//         else if (amount <= 50000){
//             return amount * 0.05;
//         } 
//         else {
//             return amount * 0.075;
//         }
//     }

//     private double getRequestedAmount(int applicationId) { //get the requested loan amount from DB
//         String sql = "SELECT requested_amount FROM Loan_Application WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, applicationId);
//             ResultSet rs = stmt.executeQuery();
//             if (rs.next()){
//                 return rs.getDouble("requested_amount");
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return 0;
//     }

//     public void updateApplicantAccountBalance(int applicantId, double newBalance) {
//         String sql = "UPDATE applicants SET account_balance = ? WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setDouble(1, newBalance);
//             stmt.setInt(2, applicantId);
//             stmt.executeUpdate();
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//     }

//     private LoanApplication mapResultSetToLoan(ResultSet rs) throws SQLException {//map DB columns to the LoanApplication object
//         return new LoanApplication(
//                 rs.getInt("id"),
//                 rs.getInt("applicant_id"),
//                 rs.getString("applicant_name"),
//                 rs.getDouble("requested_amount"),
//                 rs.getDouble("approved_amount"),
//                 rs.getDouble("remaining_balance"),
//                 rs.getBoolean("fully_paid"),
//                 rs.getString("status"),
//                 rs.getString("applied_at"),
//                 rs.getString("approved_at")
//         );
//     }

//     private double calculateTotalApprovedLoans(int applicantId) { //Calculate the total approved loan amount for an applicant
//         String sql = "SELECT SUM(approved_amount) AS total FROM Loan_Application WHERE applicant_id = ? AND status = 'APPROVED'";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, applicantId);
//             ResultSet rs = stmt.executeQuery();
//             if (rs.next()){
//                 return rs.getDouble("total");
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//         return 0;
//     }
    
//     private void updateApplicantApprovedLoan(int applicantId, double totalApprovedAmount) {//Update the Applicant table with the new total approved loan amount
//         String sql = "UPDATE applicants SET approved_loan_amount = ? WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setDouble(1, totalApprovedAmount);
//             stmt.setInt(2, applicantId);
//             stmt.executeUpdate();
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//     }

    
//     private void recordApprovedLoan(LoanApplication app) { // store approved loan(s)
//         double totalLoanAmount = app.getApprovedAmount();
        
//         String sql = "INSERT INTO loan (applicant_id, applicant_name, loan_application_id, loan_amount) " +
//                 "VALUES (?, ?, ?, ?)";

//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, app.getApplicantId());
//             stmt.setString(2, app.getApplicantName());
//             stmt.setInt(3, app.getApplicationId());
//             stmt.setDouble(4, totalLoanAmount);
//             stmt.executeUpdate();

//             updateRemainingBalance(app.getApplicationId(), totalLoanAmount);

//             System.out.println("Approved loan recorded. Total = " + totalLoanAmount);
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//     }

//     private void updateRemainingBalance(int applicationId, double amount) { //Update remaining balance yet to be paid by the applicant
//         String sql = "UPDATE Loan_Application SET remaining_balance = ? WHERE id = ?";
//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setDouble(1, amount);
//             stmt.setInt(2, applicationId);
//             stmt.executeUpdate();
//         } catch (SQLException e) {
//             e.printStackTrace();
//         }
//     }

//     private void markLoanAsPaidOff(int loanId, int applicationId) throws SQLException { //Marks loan as completely "paid-off"
//         String sql1 = "UPDATE loan SET status = 'PAID-OFF' WHERE id = ?";
//         String sql2 = "UPDATE Loan_Application SET fully_paid = TRUE, status = 'PAID-OFF' WHERE id = ?";
    
//         try (PreparedStatement stmt = conn.prepareStatement(sql1)) {
//             stmt.setInt(1, loanId);
//             stmt.executeUpdate();
//         }
//         try (PreparedStatement stmt = conn.prepareStatement(sql2)) {
//             stmt.setInt(1, applicationId);
//             stmt.executeUpdate();
//         }
//     }

//     private LoanPayment fetchLoanPaymentById(int paymentId) { //Retrieves a LoanPayment using paymentID
//         String sql = "SELECT * FROM loan_payment WHERE id = ?";

//         try (PreparedStatement stmt = conn.prepareStatement(sql)) {
//             stmt.setInt(1, paymentId);
//             ResultSet rs = stmt.executeQuery();

//             if (rs.next()) {
//                 return new LoanPayment(
//                         rs.getInt("id"),
//                         rs.getInt("loan_id"),
//                         rs.getInt("applicant_id"),
//                         rs.getDouble("amount_paid"),
//                         rs.getDouble("remaining_balance"),
//                         rs.getString("paid_at"));
//             }

//         } catch (SQLException e) {
//             e.printStackTrace();
//         }

//         return null;
//     }
// }

package com.tunde.loanworkflow.service;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

import com.tunde.loanworkflow.config.DBConnection;
import com.tunde.loanworkflow.dto.ApplicantRequest;
import com.tunde.loanworkflow.dto.LoanApplicationRequest;
import com.tunde.loanworkflow.dto.LoanPaymentRequest;
import com.tunde.loanworkflow.model.Applicant;
import com.tunde.loanworkflow.model.Loan;
import com.tunde.loanworkflow.model.LoanApplication;
import com.tunde.loanworkflow.model.LoanPayment;
import com.tunde.loanworkflow.enums.LoanStatus;
import com.tunde.loanworkflow.exception.*;

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
        String sql = "INSERT INTO applicants (name, email, account_balance, approved_loan_amount) VALUES (?, ?, ?, ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, request.getName());
            stmt.setString(2, request.getEmail());
            stmt.setDouble(3, request.getAccountBalance());
            stmt.setDouble(4, 0); // New applicants start with 0 approved loan amount
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
                return new Applicant(
                        rs.getInt("id"),
                        rs.getString("name"),
                        rs.getString("email"),
                        rs.getDouble("account_balance"),
                        rs.getDouble("approved_loan_amount"),
                        rs.getString("created_at")
                );
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
                applicants.add(new Applicant(
                        rs.getInt("id"),
                        rs.getString("name"),
                        rs.getString("email"),
                        rs.getDouble("account_balance"),
                        rs.getDouble("approved_loan_amount"),
                        rs.getString("created_at")
                ));
            }
        } catch (SQLException e) {
            throw new LoanException("Database error: " + e.getMessage());
        }
        return applicants;
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

        String sql = "INSERT INTO Loan_Application (applicant_id, applicant_name, requested_amount, approved_amount, remaining_balance, fully_paid) VALUES (?, ?, ?, 0, 0, FALSE)";
        try (PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, applicantId);
            stmt.setString(2, app.getName());
            stmt.setDouble(3, request.getAmountRequested());
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
            approvedAmount += calculateInterest(approvedAmount);
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
        return new LoanApplication(
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
        double totalLoanAmount = app.getApprovedAmount();

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