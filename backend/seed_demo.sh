#!/usr/bin/env bash
#
# seed_demo.sh — Re-runnable demo seed for the Loan Workflow app.
#
# WHAT IT DOES
#   Step 1: Wipes the four loan data tables (loan_payment, loan, loan_application,
#           applicants), handling FK order, and resets their AUTO_INCREMENT.
#   Step 2: Seeds a small, curated demo dataset THROUGH THE REST API so the backend
#           computes amortization totals, interest-tier rates, loan rows and all FK
#           relationships itself (nothing is hand-inserted into loan/loan_payment).
#
# END STATE: 7 loan applications
#   - 2 PENDING          (Liam O'Connor, Aisha Khan)
#   - 3 APPROVED/active  (Maya Chen, Marcus Bell, Priya Nair)   -> loan.status = ACTIVE
#   - 1 PAID-OFF         (Sofia Alvarez)                        -> loan.status = PAID-OFF
#   - 1 REJECTED         (Devon Ross)                           -> no loan row
#
# Re-running is safe: it clears first, then reseeds from scratch.
#
# USAGE
#   ./seed_demo.sh [API_BASE] [DB_HOST] [DB_PORT] [DB_NAME] [DB_USER] [DB_PASS]
#
# DEFAULTS
#   API_BASE=http://localhost:8080
#   DB_HOST=127.0.0.1  DB_PORT=3307  DB_NAME=loan_app_db  DB_USER=admin  DB_PASS=admin123
#   (DB creds match backend/src/main/java/com/work/loanworkflow/config/DBConfig.java)
#
# REQUIRES: bash, curl, jq, mysql. The Spring Boot backend must be running & healthy.
#
set -euo pipefail

API="${1:-http://localhost:8080}"
DB_HOST="${2:-127.0.0.1}"
DB_PORT="${3:-3307}"
DB_NAME="${4:-loan_app_db}"
DB_USER="${5:-admin}"
DB_PASS="${6:-admin123}"

log() { printf '%s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

mysql_do() {
  mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "$1"
}

# ---- REST helpers (stdout = the single value the caller wants; logs go to stderr) ----

add_applicant() { # name email balance income debt employment -> applicant id
  local body id
  body=$(jq -n --arg name "$1" --arg email "$2" --argjson bal "$3" \
               --argjson inc "$4" --argjson debt "$5" --arg emp "$6" \
    '{name:$name,email:$email,accountBalance:$bal,annualIncome:$inc,monthlyDebt:$debt,employmentStatus:$emp}')
  id=$(curl -sS -X POST "$API/api/applicants" -H 'Content-Type: application/json' -d "$body" \
        | jq -r '.data.id // empty')
  [[ -n "$id" ]] || die "applicant create failed for '$1'"
  log "  applicant #$id  $1"
  printf '%s' "$id"
}

apply_loan() { # applicantId applicantName amount purpose term -> applicationId
  local body appId
  body=$(jq -n --arg name "$2" --argjson amt "$3" --arg purpose "$4" --argjson term "$5" \
    '{applicantName:$name,amountRequested:$amt,loanPurpose:$purpose,termMonths:$term}')
  appId=$(curl -sS -X POST "$API/api/loan-applications/applicant/$1" \
            -H 'Content-Type: application/json' -d "$body" \
          | jq -r '.data.applicationId // empty')
  [[ -n "$appId" ]] || die "loan application failed for applicant #$1"
  log "    application #$appId  \$$3 / ${5}mo / $4"
  printf '%s' "$appId"
}

set_status() { # applicationId STATUS
  curl -sS -X PUT "$API/api/loan-applications/$1/status?status=$2" >/dev/null
  log "    application #$1 -> $2"
}

loan_id_for() { # applicantId -> newest loan id for that applicant
  curl -sS "$API/api/loans/applicant/$1" | jq -r 'max_by(.id).id // empty'
}

pay() { # loanId amount
  local body
  body=$(jq -n --argjson amt "$2" '{amount:$amt}')
  curl -sS -X POST "$API/api/payments/loan/$1" -H 'Content-Type: application/json' -d "$body" \
    | jq -r '.message' | sed 's/^/    payment: /' >&2
}

deposit() { # applicantId amount
  local body
  body=$(jq -n --argjson amt "$2" '{amount:$amt}')
  curl -sS -X POST "$API/api/applicants/$1/deposit" -H 'Content-Type: application/json' -d "$body" >/dev/null
  log "    deposit \$$2 -> applicant #$1"
}

remaining_of_loan() { # loanId -> remaining_balance on its application
  curl -sS "$API/api/loans/$1" | jq -r '.loanAmount'
}

# =====================================================================
# STEP 1 — clear the four loan tables and reset AUTO_INCREMENT
# =====================================================================
log "== Step 1: clearing loan tables on $DB_HOST:$DB_PORT/$DB_NAME =="
mysql_do "SET FOREIGN_KEY_CHECKS=0;
          TRUNCATE TABLE loan_payment;
          TRUNCATE TABLE loan;
          TRUNCATE TABLE loan_application;
          TRUNCATE TABLE applicants;
          SET FOREIGN_KEY_CHECKS=1;"
log "   cleared: loan_payment, loan, loan_application, applicants"

# =====================================================================
# STEP 2 — seed 7 curated applicants/applications through the REST API
# =====================================================================
log "== Step 2: seeding demo data via $API =="

# 1) Maya Chen — APPROVE, two partial payments of $800
log "1) Maya Chen"
MAYA=$(add_applicant "Maya Chen" "maya.chen@example.com" 6000 145000 900 "EMPLOYED")
MAYA_APP=$(apply_loan "$MAYA" "Maya Chen" 18000 "Home improvement" 24)
set_status "$MAYA_APP" APPROVED
MAYA_LOAN=$(loan_id_for "$MAYA")
pay "$MAYA_LOAN" 800
pay "$MAYA_LOAN" 800

# 2) Marcus Bell — APPROVE, one payment of $1000
log "2) Marcus Bell"
MARCUS=$(add_applicant "Marcus Bell" "marcus.bell@example.com" 3000 72000 650 "EMPLOYED")
MARCUS_APP=$(apply_loan "$MARCUS" "Marcus Bell" 30000 "Debt consolidation" 36)
set_status "$MARCUS_APP" APPROVED
MARCUS_LOAN=$(loan_id_for "$MARCUS")
pay "$MARCUS_LOAN" 1000

# 3) Priya Nair — APPROVE, no payments
log "3) Priya Nair"
PRIYA=$(add_applicant "Priya Nair" "priya.nair@example.com" 25000 210000 400 "EMPLOYED")
PRIYA_APP=$(apply_loan "$PRIYA" "Priya Nair" 50000 "Business" 48)
set_status "$PRIYA_APP" APPROVED

# 4) Devon Ross — REJECT
log "4) Devon Ross"
DEVON=$(add_applicant "Devon Ross" "devon.ross@example.com" 500 26000 1400 "UNEMPLOYED")
DEVON_APP=$(apply_loan "$DEVON" "Devon Ross" 40000 "Auto" 12)
set_status "$DEVON_APP" REJECTED

# 5) Sofia Alvarez — APPROVE then PAY OFF FULLY (top up first if balance is short)
log "5) Sofia Alvarez"
SOFIA=$(add_applicant "Sofia Alvarez" "sofia.alvarez@example.com" 15000 90000 300 "EMPLOYED")
SOFIA_APP=$(apply_loan "$SOFIA" "Sofia Alvarez" 12000 "Medical" 24)
set_status "$SOFIA_APP" APPROVED
SOFIA_LOAN=$(loan_id_for "$SOFIA")
SOFIA_REMAINING=$(remaining_of_loan "$SOFIA_LOAN")
SOFIA_BAL=$(curl -sS "$API/api/applicants/$SOFIA" | jq -r '.accountBalance')
NEED=$(awk -v r="$SOFIA_REMAINING" -v b="$SOFIA_BAL" 'BEGIN{d=r-b; print (d>0)?d:0}')
if awk -v n="$NEED" 'BEGIN{exit !(n>0)}'; then
  deposit "$SOFIA" "$NEED"
fi
pay "$SOFIA_LOAN" "$SOFIA_REMAINING"

# 6) Liam O'Connor — leave PENDING
log "6) Liam O'Connor"
LIAM=$(add_applicant "Liam O'Connor" "liam.oconnor@example.com" 4000 65000 500 "EMPLOYED")
apply_loan "$LIAM" "Liam O'Connor" 8000 "Education" 12 >/dev/null

# 7) Aisha Khan — leave PENDING
log "7) Aisha Khan"
AISHA=$(add_applicant "Aisha Khan" "aisha.khan@example.com" 9000 110000 700 "EMPLOYED")
apply_loan "$AISHA" "Aisha Khan" 25000 "Home improvement" 36 >/dev/null

log ""
log "== Done. Summary from API =="
curl -sS "$API/api/loan-applications" \
  | jq -r '.[] | "  app#\(.applicationId)  \(.applicantName)  \(.status)  term=\(.termMonths)mo"' >&2
log ""
log "Applications by status:"
curl -sS "$API/api/loan-applications" \
  | jq -r 'group_by(.status)[] | "  \(.[0].status): \(length)"' >&2
log "Total funded (sum of distinct approved loan amounts):"
curl -sS "$API/api/loans" | jq -r '"  $\(map(.loanAmount) | add)"' >&2
