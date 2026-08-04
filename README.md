# Loan Workflow

An AI-powered loan-workflow application. It is a monorepo containing a Spring Boot API (`backend/`) and a React + Vite app (`frontend/`), plus an AI underwriter powered by Claude **Sonnet 5**.

## Overview

The app has two roles that share a single data store:

- **Customer** — apply for a loan, track application status, and make payments.
- **Northline Capital Staff** — review applications, approve or reject them, and see the portfolio view.

Both roles read and write the same MySQL-backed records.

**Stack**

- **Backend** — Spring Boot 4 (Java 17), raw JDBC to MySQL.
- **Frontend** — React 19 + Vite + TypeScript + Tailwind v4.
- **AI** — Claude **Sonnet 5** via the official Anthropic Java SDK, providing an explainable credit-underwriting assessment.

## Prerequisites

- **Java 17**
- **Node.js 18+** and **npm**
- **MySQL** running locally on **port 3307**, with a database named `loan_app_db`. The app connects as user `admin` with password `admin123`. The schema lives in `backend/src/main/resources/tables.sql`.
- An **Anthropic API key** (for the AI underwriter).

## Setup

### Database

Create the `loan_app_db` database and tables from the bundled schema, for example:

```bash
mysql -h 127.0.0.1 -P 3307 -u admin -p < backend/src/main/resources/tables.sql
```

### Anthropic API key

Copy the example env file and set your key:

```bash
cp backend/.env.example backend/.env
# then edit backend/.env and set:
# ANTHROPIC_API_KEY=sk-ant-...
```

The backend reads `backend/.env` automatically. Without a key the app still runs, but the
AI-assessment endpoint returns **HTTP 502** (`AI underwriting unavailable`).

> `backend/.env` is gitignored — never commit your key.

## Run it (two terminals)

1. **Backend**

   ```bash
   cd backend && ./gradlew bootRun
   ```

   Serves <http://localhost:8080>. Wait for the log line `Tomcat started on port 8080`.

2. **Frontend**

   ```bash
   cd frontend && npm install && npm run dev
   ```

   Serves <http://localhost:5173>.

3. Open <http://localhost:5173> and use the **Customer / Northline · Staff** toggle at the top right to switch roles.

## Key API endpoints

Base URL: `http://localhost:8080`

**Applicants**

- `POST /api/applicants`
- `GET /api/applicants`
- `GET /api/applicants/{id}`

**Loan applications**

- `POST /api/loan-applications/applicant/{applicantId}`
- `GET /api/loan-applications`
- `GET /api/loan-applications/{id}`
- `PUT /api/loan-applications/{applicationId}/status?status=APPROVED|REJECTED[&approvedAmount=...]`

**AI underwriter (Claude Sonnet 5)**

- `POST /api/loan-applications/{applicationId}/ai-assessment`

  Returns a structured, explainable credit assessment:

  - `riskScore` (0–100)
  - `recommendation` (`APPROVE` / `REFER` / `DECLINE`)
  - `recommendedAmount`
  - `recommendedRate`
  - `debtToIncomeRatio`
  - `keyFactors[]`
  - `redFlags[]`
  - `rationale`
  - `summary`

  Advisory only — it does **not** change the loan status.

**Loans & payments**

- `GET /api/loans`
- `POST /api/payments/loan/{loanId}`
- `GET /api/payments`

**API docs**

- Swagger UI at <http://localhost:8080/docs>

## Notes / current state

- The AI underwriter is live at the API layer today; the staff-facing UI panel that displays the assessment is in progress.
- CORS allows `http://localhost:5173`. There is **no authentication** on the API (this is a demo).
- A backup of the original project is at `~/Desktop/loan-workflow-backup-*`.
