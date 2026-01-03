# Loan Application Workflow API

A Spring Boot REST API for managing loan applications, applicants, and payments with MySQL database integration and Swagger UI documentation.

---

## Prerequisites

- Java 17+
- Gradle
- MySQL

---

## Database Setup

### 1. Create the Database(SQL)

CREATE DATABASE loan_app_db;

### 2. Configure Database Connection

The database connection is configured in `DBConfig.java`:

public static final String URL = "jdbc:mysql://localhost:3306/loan_app_db?useSSL=false&serverTimezone=UTC";
public static final String USER = "admin";
public static final String PASSWORD = "admin123";

Make sure your MySQL server is running with these credentials, or update them to match your setup.

---

## Running the Application

### Using Gradle

# Navigate to project directory
cd loanworkflow

# Build the project
gradle build

# Run the application
gradle bootRun

The application will start on `http://localhost:8080`

---

## Accessing Swagger UI

Once the application is running, open your browser and navigate to:

http://localhost:8080/docs

Or access the API documentation directly:

http://localhost:8080/api-docs

---

## Application Flow

The loan workflow follows this sequence:

┌─────────────┐     ┌──────────────────┐     ┌─────────┐     ┌─────────────┐
│  APPLICANT  │ --> │ LOAN APPLICATION │ --> │  LOAN   │ --> │ LOAN PAYMENT│
└─────────────┘     └──────────────────┘     └─────────┘     └─────────────┘

### Step 1: Create an Applicant

**Endpoint:** `POST /api/applicants`

{
  "name": "John Doe",
  "email": "john@example.com",
  "accountBalance": 10000.00
}

### Step 2: Apply for a Loan

**Endpoint:** `POST /api/loan-applications/applicant/{applicantId}`

{
  "amountRequested": 5000.00
}

Status will be set to `PENDING`.

### Step 3: Approve/Reject the Loan Application

**Endpoint:** `PUT /api/loan-applications/{applicationId}/status`

Query Parameters:
- `status`: `APPROVED`, `REJECTED`
- `approvedAmount` (optional): Custom approved amount

When approved:
- Interest is automatically calculated and added (2.5% - 7.5% based on amount)
- A new `Loan` record is created in the `loan` table

### Step 4: Make Loan Payments

**Endpoint:** `POST /api/payments/loan/{loanId}`

{
  "amount": 1000.00
}

- Payment is deducted from applicant's account balance
- Remaining loan balance is updated
- When fully paid, loan status changes from `ACTIVE` to `PAID-OFF`

---

## API Endpoints Summary

### Applicants (`/api/applicants`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/applicants` | Create new applicant |
| GET | `/api/applicants` | Get all applicants |
| GET | `/api/applicants/{id}` | Get applicant by ID |

### Loan Applications (`/api/loan-applications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/loan-applications/applicant/{applicantId}` | Apply for a loan |
| GET | `/api/loan-applications` | Get all applications |
| GET | `/api/loan-applications/{applicationId}` | Get application by ID |
| GET | `/api/loan-applications/applicant/{applicantId}` | Get applications by applicant |
| PUT | `/api/loan-applications/{applicationId}/status` | Update application status |

### Loans (`/api/loans`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loans` | Get all loans |
| GET | `/api/loans/{id}` | Get loan by ID |
| GET | `/api/loans/applicant/{applicantId}` | Get loans by applicant |

### Loan Payments (`/api/payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/loan/{loanId}` | Make a payment |
| GET | `/api/payments` | Get all payments |
| GET | `/api/payments/loan/{loanId}` | Get payments by loan |
| GET | `/api/payments/applicant/{applicantId}` | Get payments by applicant |

---

## Interest Rates

Interest is automatically calculated when a loan is approved:

| Loan Amount | Interest Rate |
|-------------|---------------|
| ≤ 10,000 | 2.5% |
| ≤ 50,000 | 5.0% |
| > 50,000 | 7.5% |

---

## Loan Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Application submitted, awaiting review |
| `APPROVED` | Application approved, loan is active |
| `REJECTED` | Application denied |
| `ACTIVE` | Loan is currently being repaid |
| `PAID-OFF` | Loan has been fully repaid |

---

## Project Structure

src/main/java/com/tunde/loanworkflow/
├── config/
│   ├── DBConfig.java
│   └── DBConnection.java
├── controller/
│   ├── ApplicantController.java
│   ├── LoanApplicationController.java
│   ├── LoanController.java
│   ├── LoanPaymentController.java
│   └── WelcomeController.java
├── dto/
│   ├── ApplicantRequest.java
│   ├── LoanApplicationRequest.java
│   └── LoanPaymentRequest.java
├── enums/
│   └── LoanStatus.java
├── exception/
│   ├── LoanException.java
│   ├── LoanMessage.java
│   └── GlobalExceptionHandler.java
├── model/
│   ├── Applicant.java
│   ├── Loan.java
│   ├── LoanApplication.java
│   └── LoanPayment.java
├── service/
│   └── LoanService.java
└── OpenAPIConfig.java

---
