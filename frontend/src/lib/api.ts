// ---------------------------------------------------------------------------
// Typed HTTP client for the Loan Workflow Spring Boot backend.
//
// The component's domain model (loan/model.ts) uses STRING ids; the backend
// uses integer ids. Every response is normalized so ids become strings — that
// keeps the whole UI + orchestrator typed exactly as authored, and only this
// file knows the ids are really numbers on the wire.
//
// Response envelopes:
//   - POST / PUT succeed with a wrapper  { message, data }.  We return `data`.
//     (The status PUT is the exception: it returns { message } with NO data —
//      callers must re-fetch, which decideApplication() does for you.)
//   - GET list endpoints return a bare JSON array. GOTCHA: an *empty* result is
//     returned by the backend as an ERROR (it throws "No … found"), not []. We
//     detect that specific message and return [] instead of throwing.
//   - Any other non-2xx is surfaced as an ApiError with the backend message.
// ---------------------------------------------------------------------------

import type {
  Applicant,
  LoanApplication,
  Loan,
  LoanPayment,
  ApplicationStatus,
  CreditAssessment,
} from '../components/magicpath/loan-workflow-modern-fintech-v1/loan/model';

const BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// The backend serializes every id as an integer. These raw shapes mirror the
// wire exactly; the normalize* fns convert them to the string-id model types.
interface RawApplicant {
  id: number;
  name: string;
  email: string;
  accountBalance: number;
  approvedLoanAmount: number;
  annualIncome: number;
  monthlyDebt: number;
  employmentStatus: string | null;
  createdAt: string;
}
interface RawApplication {
  applicationId: number;
  applicantId: number;
  applicantName: string;
  amountRequested: number;
  approvedAmount: number;
  remainingBalance: number;
  fullyPaid: boolean;
  status: string;
  loanPurpose: string | null;
  termMonths: number;
  createdAt: string;
  approvedAt: string | null;
}
interface RawLoan {
  id: number;
  applicantId: number;
  applicantName: string;
  loanApplicationId: number;
  loanAmount: number;
  status: string;
  issuedAt: string;
}
interface RawPayment {
  id: number;
  loanId: number;
  applicantId: number;
  amountPaid: number;
  paidAt: string;
  remainingBalance: number;
}

const s = (n: number | string): string => String(n);

const normalizeApplicant = (r: RawApplicant): Applicant => ({
  id: s(r.id),
  name: r.name,
  email: r.email,
  accountBalance: r.accountBalance,
  approvedLoanAmount: r.approvedLoanAmount,
  annualIncome: r.annualIncome,
  monthlyDebt: r.monthlyDebt,
  employmentStatus: r.employmentStatus,
  createdAt: r.createdAt,
});

const normalizeApplication = (r: RawApplication): LoanApplication => ({
  applicationId: s(r.applicationId),
  applicantId: s(r.applicantId),
  applicantName: r.applicantName,
  amountRequested: r.amountRequested,
  approvedAmount: r.approvedAmount,
  remainingBalance: r.remainingBalance,
  fullyPaid: r.fullyPaid,
  status: r.status as ApplicationStatus,
  loanPurpose: r.loanPurpose,
  termMonths: r.termMonths,
  createdAt: r.createdAt,
  approvedAt: r.approvedAt,
});

const normalizeLoan = (r: RawLoan): Loan => ({
  id: s(r.id),
  applicantId: s(r.applicantId),
  applicantName: r.applicantName,
  loanApplicationId: s(r.loanApplicationId),
  loanAmount: r.loanAmount,
  status: r.status as Loan['status'],
  issuedAt: r.issuedAt,
});

const normalizePayment = (r: RawPayment): LoanPayment => ({
  id: s(r.id),
  loanId: s(r.loanId),
  applicantId: s(r.applicantId),
  amountPaid: r.amountPaid,
  paidAt: r.paidAt,
  remainingBalance: r.remainingBalance,
});

// ---------------------------------------------------------------------------
// low-level helpers
// ---------------------------------------------------------------------------

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || body?.error || res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

// The backend reports "empty collection" as an ERROR, e.g. it throws
// "No applications found" / "No loans found for applicant ID: 5". Two ways that
// surfaces, both handled below:
//   (a) when the exception message reaches the body, it matches this regex;
//   (b) OBSERVED in this runtime the default error body is
//       {timestamp,status:500,error:"Internal Server Error",path} with NO
//       message field — so on a list endpoint we also treat any 5xx as "empty".
// Anything else (4xx, network) is surfaced as a real error.
const EMPTY_LIST_RE = /no\s+(applications|loans|payments)\s+found/i;

async function getList<Raw, T>(
  path: string,
  normalize: (raw: Raw) => T,
): Promise<T[]> {
  const res = await fetch(`${BASE}${path}`);
  if (res.ok) {
    const arr = (await res.json()) as Raw[];
    return Array.isArray(arr) ? arr.map(normalize) : [];
  }
  const msg = await errorMessage(res);
  if (EMPTY_LIST_RE.test(msg) || res.status >= 500) return [];
  throw new ApiError(msg, res.status);
}

async function getOne<Raw, T>(
  path: string,
  normalize: (raw: Raw) => T,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return normalize((await res.json()) as Raw);
}

// POST/PUT that return the { message, data } envelope → returns data.
async function sendWrapped<Raw>(
  path: string,
  method: 'POST' | 'PUT',
  body?: unknown,
): Promise<Raw> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  const wrapped = (await res.json()) as { message: string; data: Raw };
  return wrapped.data;
}

// ---------------------------------------------------------------------------
// Applicants
// ---------------------------------------------------------------------------

export function createApplicant(input: {
  name: string;
  email: string;
  accountBalance: number;
  annualIncome: number;
  monthlyDebt: number;
  employmentStatus: string;
}): Promise<Applicant> {
  return sendWrapped<RawApplicant>('/api/applicants', 'POST', input).then(
    normalizeApplicant,
  );
}

// Full applicant record (email, balance, income, debt, employment) — used by the
// staff detail view, which only carries the loan application otherwise.
export function getApplicantById(applicantId: string): Promise<Applicant> {
  return getOne<RawApplicant, Applicant>(
    `/api/applicants/${applicantId}`,
    normalizeApplicant,
  );
}

// ---------------------------------------------------------------------------
// Loan applications
// ---------------------------------------------------------------------------

export function applyForLoan(
  applicantId: string,
  input: { amountRequested: number; loanPurpose: string; termMonths: number },
): Promise<LoanApplication> {
  return sendWrapped<RawApplication>(
    `/api/loan-applications/applicant/${applicantId}`,
    'POST',
    {
      amountRequested: input.amountRequested,
      loanPurpose: input.loanPurpose,
      termMonths: input.termMonths,
    },
  ).then(normalizeApplication);
}

// ---------------------------------------------------------------------------
// Amortization schedule for an APPROVED application. Unlike the wrapped
// POST/PUT endpoints, this returns a BARE JSON array (no {message,data}
// envelope) of per-payment rows. When the application is NOT approved the
// backend responds 400 with { message: "…only available for APPROVED…" }; we
// surface that as an ApiError so the UI can hide the table / show a note.
// ---------------------------------------------------------------------------
export interface AmortizationRow {
  paymentNumber: number;
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

export async function getAmortizationSchedule(
  applicationId: string,
): Promise<AmortizationRow[]> {
  const res = await fetch(
    `${BASE}/api/loan-applications/${applicationId}/amortization`,
  );
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  const arr = (await res.json()) as AmortizationRow[];
  return Array.isArray(arr) ? arr : [];
}

// ---------------------------------------------------------------------------
// AI underwriting — on-demand credit assessment for one application.
// Returns the CreditAssessment JSON DIRECTLY (HTTP 200, no {message,data}
// envelope). On a non-2xx (e.g. 502 when ANTHROPIC_API_KEY/model is missing)
// the backend sends { message: "AI underwriting unavailable: ..." }; we throw
// an ApiError carrying that message so the UI can surface it inline.
// ---------------------------------------------------------------------------

export async function getAiAssessment(
  applicationId: string,
): Promise<CreditAssessment> {
  const res = await fetch(
    `${BASE}/api/loan-applications/${applicationId}/ai-assessment`,
    { method: 'POST' },
  );
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as CreditAssessment;
}

// ---------------------------------------------------------------------------
// Borrower AI copilot — grounded chat about the applicant's own loan(s).
// POST /api/copilot/applicant/{applicantId} with { messages } → { reply }.
// Unlike the list/detail endpoints, this returns the reply DIRECTLY (no
// {message,data} envelope). The reply is markdown (may contain ## headers and
// GFM tables). On a non-2xx (400 bad messages, 404 unknown applicant, 502 AI
// unavailable) the backend sends { message: "…" }; we throw an ApiError
// carrying it so the UI can show an "assistant unavailable" note inline.
// ---------------------------------------------------------------------------

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askCopilot(
  applicantId: number,
  messages: CopilotMessage[],
): Promise<string> {
  const res = await fetch(`${BASE}/api/copilot/applicant/${applicantId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  const body = (await res.json()) as { reply: string };
  return body.reply;
}

export function listApplications(): Promise<LoanApplication[]> {
  return getList<RawApplication, LoanApplication>(
    '/api/loan-applications',
    normalizeApplication,
  );
}

export function getApplication(applicationId: string): Promise<LoanApplication> {
  return getOne<RawApplication, LoanApplication>(
    `/api/loan-applications/${applicationId}`,
    normalizeApplication,
  );
}

export function getApplicationsByApplicant(
  applicantId: string,
): Promise<LoanApplication[]> {
  return getList<RawApplication, LoanApplication>(
    `/api/loan-applications/applicant/${applicantId}`,
    normalizeApplication,
  );
}

/**
 * Approve or reject an application. `status` MUST be "APPROVED" or "REJECTED"
 * (uppercase — the backend enum rejects anything else with a 400). For a partial
 * approval pass the approved BASE amount; the backend adds interest on top and
 * stores the total. The PUT returns only a message (no data), so we re-fetch the
 * fresh application and return that — with the authoritative approvedAmount.
 */
export async function decideApplication(
  applicationId: string,
  status: 'APPROVED' | 'REJECTED',
  approvedBase?: number,
): Promise<LoanApplication> {
  let path = `/api/loan-applications/${applicationId}/status?status=${status}`;
  if (status === 'APPROVED' && approvedBase != null) {
    path += `&approvedAmount=${approvedBase}`;
  }
  const res = await fetch(`${BASE}${path}`, { method: 'PUT' });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return getApplication(applicationId);
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

export function listLoans(): Promise<Loan[]> {
  return getList<RawLoan, Loan>('/api/loans', normalizeLoan);
}

export function getLoansByApplicant(applicantId: string): Promise<Loan[]> {
  return getList<RawLoan, Loan>(
    `/api/loans/applicant/${applicantId}`,
    normalizeLoan,
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function makePayment(
  loanId: string,
  input: { amount: number },
): Promise<LoanPayment> {
  return sendWrapped<RawPayment>(
    `/api/payments/loan/${loanId}`,
    'POST',
    { amount: input.amount },
  ).then(normalizePayment);
}

// Every payment across the whole book — powers the staff analytics dashboard's
// "total repaid" and repayment aggregates. Same empty-as-[] handling as the
// other list endpoints (backend throws "No payments found" on an empty book).
export function listPayments(): Promise<LoanPayment[]> {
  return getList<RawPayment, LoanPayment>('/api/payments', normalizePayment);
}

export function getPaymentsByLoan(loanId: string): Promise<LoanPayment[]> {
  return getList<RawPayment, LoanPayment>(
    `/api/payments/loan/${loanId}`,
    normalizePayment,
  );
}

export function getPaymentsByApplicant(
  applicantId: string,
): Promise<LoanPayment[]> {
  return getList<RawPayment, LoanPayment>(
    `/api/payments/applicant/${applicantId}`,
    normalizePayment,
  );
}
