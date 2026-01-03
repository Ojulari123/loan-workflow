CREATE DATABASE IF NOT EXISTS loan_app_db;
USE loan_app_db;

-- Applicants Table
CREATE TABLE IF NOT EXISTS applicants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    account_balance DECIMAL(12,2) DEFAULT 0.00,
    approved_loan_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan Application Table
CREATE TABLE IF NOT EXISTS loan_application (
    id INT PRIMARY KEY AUTO_INCREMENT,
    applicant_id INT NOT NULL,
    applicant_name VARCHAR(100) NOT NULL,
    requested_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2) DEFAULT 0.00,
    remaining_balance DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING',
    fully_paid BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE
);

-- Loan Table
CREATE TABLE IF NOT EXISTS loan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    applicant_id INT NOT NULL,
    applicant_name VARCHAR(100) NOT NULL,
    loan_application_id INT NOT NULL,
    loan_amount DECIMAL(12,2) NOT NULL,
    status ENUM('ACTIVE', 'PAID-OFF') DEFAULT 'ACTIVE',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_application_id) REFERENCES Loan_Application(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE
);

-- Loan Payment Table
CREATE TABLE IF NOT EXISTS loan_payment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    loan_id INT NOT NULL,
    applicant_id INT NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remaining_balance DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loan(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE
);
