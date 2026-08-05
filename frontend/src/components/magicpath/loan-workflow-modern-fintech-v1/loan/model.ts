// ---------------------------------------------------------------------------
// Domain model — field names + status literals mirror the real backend exactly
// (camelCase JSON). This is a client-only simulation, but everything here is
// shaped so it can be wired to the live API later with no field renaming.
// ---------------------------------------------------------------------------

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID-OFF';
export type LoanStatus = 'ACTIVE' | 'PAID-OFF';
export interface Applicant {
  id: string;
  name: string;
  email: string;
  accountBalance: number;
  approvedLoanAmount: number | null;
  annualIncome: number;
  monthlyDebt: number;
  employmentStatus: string | null;
  createdAt: string;
}
export interface LoanApplication {
  applicationId: string;
  applicantId: string;
  applicantName: string;
  amountRequested: number;
  approvedAmount: number | null;
  remainingBalance: number | null;
  fullyPaid: boolean;
  status: ApplicationStatus;
  loanPurpose: string | null;
  termMonths: number; // repayment term in months (backend serializes it on every application)
  createdAt: string;
  approvedAt: string | null;
}
export interface Loan {
  id: string;
  applicantId: string;
  applicantName: string;
  loanApplicationId: string;
  loanAmount: number;
  status: LoanStatus;
  issuedAt: string;
}
export interface LoanPayment {
  id: string;
  loanId: string;
  applicantId: string;
  amountPaid: number;
  paidAt: string;
  remainingBalance: number;
  // New applicant account balance after the charge. Present on the POST
  // /api/payments/loan/{loanId} response; absent on list endpoints (optional).
  accountBalance?: number;
}

// ---------------------------------------------------------------------------
// AI credit assessment — mirrors the backend CreditAssessment JSON (camelCase),
// returned by POST /api/loan-applications/{applicationId}/ai-assessment.
// Advisory only; the officer's Approve/Reject remains the final action.
// ---------------------------------------------------------------------------

export type FactorImpact = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type Recommendation = 'APPROVE' | 'REFER' | 'DECLINE';
export interface Factor {
  factor: string;
  impact: FactorImpact;
  detail: string;
}
export interface CreditAssessment {
  riskScore: number; // 0..100, higher = safer
  recommendation: Recommendation;
  recommendedAmount: number;
  recommendedRate: number; // fraction, e.g. 0.075
  debtToIncomeRatio: number; // fraction, e.g. 0.35
  keyFactors: Factor[];
  redFlags: string[];
  rationale: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------

/** Round to cents so repeated subtraction never leaves 8199.999999… */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
export const fmtUSD = (n: number): string => usd.format(Number.isFinite(n) ? n : 0);

/** Whole-dollar variant for large hero figures where cents are always .00 */
const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
export const fmtUSD0 = (n: number): string => usd0.format(Number.isFinite(n) ? n : 0);
export const fmtPct = (rate: number): string => `${(rate * 100).toLocaleString('en-US', {
  maximumFractionDigits: 2
})}%`;
export const fmtWhen = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

// ---------------------------------------------------------------------------
// Interest tiers — the fixed annual rate for a loan, selected by principal size.
// Repayment is standard amortization: a fixed monthly payment over the chosen
// term (see monthlyPayment / quote). Paying off early lowers the interest paid.
//   amount ≤ 10,000            → 2.5%
//   10,000 < amount ≤ 50,000   → 5%
//   amount > 50,000            → 7.5%
// ---------------------------------------------------------------------------

export interface Tier {
  rate: number; // 0.025 | 0.05 | 0.075
  label: string; // e.g. "Tier 1"
  range: string; // e.g. "≤ $10,000"
}
export const TIERS: readonly Tier[] = [{
  rate: 0.025,
  label: 'Tier 1',
  range: '≤ $10,000'
}, {
  rate: 0.05,
  label: 'Tier 2',
  range: '$10,001 to $50,000'
}, {
  rate: 0.075,
  label: 'Tier 3',
  range: '> $50,000'
}] as const;
export function tierFor(amount: number): Tier {
  if (amount <= 10000) return TIERS[0];
  if (amount <= 50000) return TIERS[1];
  return TIERS[2];
}
export function interestRate(amount: number): number {
  return tierFor(amount).rate;
}

// ---------------------------------------------------------------------------
// Repayment term — the borrower picks one of these at apply time. Mirrors the
// backend's accepted set; default matches the backend default.
// ---------------------------------------------------------------------------
export const TERM_OPTIONS: readonly number[] = [12, 24, 36, 48] as const;
export const DEFAULT_TERM_MONTHS = 24;

/**
 * Standard amortized monthly payment — MUST match the backend formula exactly:
 *   r = annualRate / 12;  M = P·r / (1 − (1+r)^−n);  when r == 0 → P / n.
 * (For P=30000, n=36, 5% → 899.13.)
 */
export function monthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  const r = annualRate / 12;
  const m = r === 0 ? principal / termMonths : principal * r / (1 - Math.pow(1 + r, -termMonths));
  return round2(m);
}

export interface Quote {
  principal: number; // the base / approved base
  rate: number;
  interest: number; // amortized interest over the term  (== total − principal)
  total: number; // total to repay  (== monthly × termMonths)
  tier: Tier;
  termMonths: number; // repayment term used for the monthly figure
  monthly: number; // estimated amortized monthly payment for principal @ this term
}

/** The core calculation used by the calculator, the apply preview and the staff
 *  decision screen. `termMonths` drives the amortized monthly payment AND the
 *  totals derived from it (defaults to DEFAULT_TERM_MONTHS for callers that
 *  don't pick one). Everything reconciles: monthly × termMonths === total, and
 *  interest === total − principal, so no figure in the UI can contradict another. */
export function quote(principal: number, termMonths: number = DEFAULT_TERM_MONTHS): Quote {
  const tier = tierFor(principal);
  const monthly = monthlyPayment(principal, tier.rate, termMonths);
  const total = round2(monthly * termMonths);
  const interest = round2(total - principal);
  return {
    principal,
    rate: tier.rate,
    interest,
    total,
    tier,
    termMonths,
    monthly
  };
}

// ---------------------------------------------------------------------------
// ID + timestamp helpers (client-only; the real backend assigns these)
// ---------------------------------------------------------------------------

let seq = 1;
export const nextId = (prefix: string): string => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;
export const nowISO = (): string => new Date().toISOString();

// ---------------------------------------------------------------------------
// Status → color token mapping. Kept in ONE place so every badge across every
// screen is consistent:  amber=PENDING, green=APPROVED, red=REJECTED,
// blue=ACTIVE, gray/green=PAID-OFF.
// ---------------------------------------------------------------------------

export interface StatusStyle {
  label: string;
  dot: string;
  bg: string;
  text: string;
  ring: string;
}
export const STATUS_STYLES: Record<string, StatusStyle> = {
  PENDING: {
    label: 'Pending',
    dot: '#d97706',
    bg: '#fffbeb',
    text: '#b45309',
    ring: '#fde68a'
  },
  APPROVED: {
    label: 'Approved',
    dot: '#16a34a',
    bg: '#f0fdf4',
    text: '#15803d',
    ring: '#bbf7d0'
  },
  REJECTED: {
    label: 'Rejected',
    dot: '#dc2626',
    bg: '#fef2f2',
    text: '#b91c1c',
    ring: '#fecaca'
  },
  ACTIVE: {
    label: 'Active',
    dot: '#2563eb',
    bg: '#eff6ff',
    text: '#1d4ed8',
    ring: '#bfdbfe'
  },
  'PAID-OFF': {
    label: 'Paid off',
    dot: '#059669',
    bg: '#f2f7f4',
    text: '#3f6212',
    ring: '#cbd5e1'
  }
};
export const statusStyle = (s: string): StatusStyle => STATUS_STYLES[s] ?? STATUS_STYLES.PENDING;

// ---------------------------------------------------------------------------
// Endpoint mapping — surfaced as subtle "maps to <endpoint>" notes so the demo
// stays wireable to the real API.
// ---------------------------------------------------------------------------

export const ENDPOINTS = {
  applyCustomer: 'POST /api/loan-applications/applicant/{applicantId}',
  staffDecide: 'PUT /api/loan-applications/{applicationId}/status?status=&approvedAmount=',
  inbox: 'GET /api/loan-applications',
  makePayment: 'POST /api/payments/loan/{loanId}'
} as const;