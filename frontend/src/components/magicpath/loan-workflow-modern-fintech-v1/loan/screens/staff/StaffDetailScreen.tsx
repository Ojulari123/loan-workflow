import React, { useEffect, useMemo, useState } from 'react';
import { LoanApplication, Applicant, CreditAssessment, quote, fmtUSD, fmtPct, fmtWhen } from '../../model';
import { Card, Button, Money, StatusBadge, Field, inputCls, ProgressRing } from '../../primitives';
import { IconChevronLeft, IconCheckCircle, IconX, IconUser, IconMail, IconWallet, IconSpark, IconShield } from '../../icons';
import * as api from '@/lib/api';

// Higher risk score = safer applicant → green; mid → amber; low → red.
const riskColor = (score: number): string => score >= 67 ? '#16a34a' : score >= 34 ? '#d97706' : '#dc2626';
const IMPACT_COLOR: Record<string, string> = {
  POSITIVE: '#16a34a',
  NEGATIVE: '#dc2626',
  NEUTRAL: '#98a2b3'
};
const RECO_STYLE: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  APPROVE: { bg: '#f0fdf4', text: '#15803d', ring: '#bbf7d0', dot: '#16a34a' },
  REFER: { bg: '#fffbeb', text: '#b45309', ring: '#fde68a', dot: '#d97706' },
  DECLINE: { bg: '#fef2f2', text: '#b91c1c', ring: '#fecaca', dot: '#dc2626' }
};

type AiStatus = 'idle' | 'loading' | 'done' | 'error';

export const StaffDetailScreen: React.FC<{
  application: LoanApplication;
  applicant: Applicant | undefined;
  onApprove: (applicationId: string, base: number) => void;
  onReject: (applicationId: string) => void;
  onBack: () => void;
  submitting?: boolean;
}> = ({
  application,
  applicant,
  onApprove,
  onReject,
  onBack,
  submitting = false
}) => {
  const requested = application.amountRequested;
  const [baseRaw, setBaseRaw] = useState(String(requested));
  const isPending = application.status === 'PENDING';

  // ---- Full applicant record --------------------------------------------------
  // The parent passes only the loan application (+ whatever applicant it has in
  // list state). Email, balance and the financial profile live on the Applicant
  // record, so fetch the authoritative copy on open. Seed from the prop so the
  // card isn't blank while the request is in flight.
  const [applicantDetail, setApplicantDetail] = useState<Applicant | undefined>(applicant);
  const [applicantLoading, setApplicantLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setApplicantLoading(true);
    api.getApplicantById(application.applicantId)
      .then(a => { if (active) setApplicantDetail(a); })
      .catch(() => { /* keep the prop fallback on failure */ })
      .finally(() => { if (active) setApplicantLoading(false); });
    return () => { active = false; };
  }, [application.applicantId]);

  // Approved base: partial approvals allowed (0 < base ≤ requested).
  const setBase = (v: string) => {
    if (v === '') return setBaseRaw('');
    let n = Number(v);
    if (Number.isNaN(n)) return;
    if (n < 0) n = 0;
    if (n > requested) n = requested;
    setBaseRaw(String(n));
  };
  const base = Math.max(0, Math.min(requested, Number(baseRaw) || 0));
  // Use the application's own term so staff see the SAME amortized figures the
  // borrower saw at apply time (monthly payment, interest and total to repay).
  const q = useMemo(() => quote(base, application.termMonths), [base, application.termMonths]);
  const valid = base > 0;

  // ---- AI Underwriter (advisory, on-demand — each call costs money) --------
  // Kept in local state so it never touches the global busy/error that gates
  // Approve/Reject; the AI panel is purely advisory.
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [assessment, setAssessment] = useState<CreditAssessment | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const runAssessment = async () => {
    setAiStatus('loading');
    setAiError(null);
    try {
      const a = await api.getAiAssessment(application.applicationId);
      setAssessment(a);
      setAiStatus('done');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI underwriting is unavailable.');
      setAiStatus('error');
    }
  };

  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <IconChevronLeft size={16} />
            Inbox
          </Button>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#101828]">Application review</h2>
            <p className="text-xs text-[#98a2b3]">
              {application.applicationId} · applied {fmtWhen(application.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {/* Applicant profile */}
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-[#101828]">Applicant</div>
          {applicantLoading && <span className="text-[11px] text-[#98a2b3]">Loading…</span>}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <IconUser size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-[#98a2b3]">Name</div>
              <div className="truncate text-sm font-semibold text-[#101828]">{application.applicantName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <IconMail size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-[#98a2b3]">Email</div>
              <div className="truncate text-sm font-semibold text-[#101828]">{applicantDetail?.email || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
              <IconWallet size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-[#98a2b3]">Account balance</div>
              <div className="truncate text-sm font-semibold text-[#101828]">
                {applicantDetail && applicantDetail.accountBalance != null ? fmtUSD(applicantDetail.accountBalance) : '—'}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#e6e9ef] bg-[#f8fafc] px-4 py-3">
          <span className="text-sm text-[#667085]">Amount requested</span>
          <Money value={requested} className="text-lg font-semibold text-[#101828]" />
        </div>

        {/* Financial profile — the inputs the AI underwrites on */}
        <div className="mt-3 rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Financial profile</div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs text-[#667085]">Annual income</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#101828]">
                {applicantDetail && applicantDetail.annualIncome != null ? fmtUSD(applicantDetail.annualIncome) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#667085]">Monthly debt</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#101828]">
                {applicantDetail && applicantDetail.monthlyDebt != null ? fmtUSD(applicantDetail.monthlyDebt) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#667085]">Employment status</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-[#101828]">
                {applicantDetail?.employmentStatus?.trim() ? applicantDetail.employmentStatus : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#667085]">Loan purpose</div>
              <div className="mt-0.5 truncate text-sm font-semibold text-[#101828]">
                {application.loanPurpose?.trim() ? application.loanPurpose : '—'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Underwriter — advisory; the officer's decision below stays final */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
              <IconSpark size={18} />
            </span>
            <div>
              <div className="text-sm font-semibold text-[#101828]">AI Underwriter</div>
            </div>
          </div>
          {aiStatus !== 'loading' && <Button variant="secondary" onClick={runAssessment}>
            <IconSpark size={15} />
            {assessment ? 'Re-run assessment' : 'Run AI assessment'}
          </Button>}
        </div>

        {aiStatus === 'idle' && <p className="mt-3 text-sm text-[#667085]">
          Run an on-demand credit assessment for a risk score, recommendation and key factors. Advisory only — your decision below is final.
        </p>}

        {aiStatus === 'loading' && <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#e6e9ef] bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#475467]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#c7d7fe] border-t-[#2563eb]" />
          Analyzing…
        </div>}

        {aiStatus === 'error' && <div className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
          <div className="flex items-start gap-2">
            <IconX size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">{aiError ?? 'AI underwriting is unavailable.'}</div>
              <div className="mt-1 text-xs text-[#b42318]">Check that ANTHROPIC_API_KEY is set in backend/.env, then try again.</div>
            </div>
          </div>
        </div>}

        {aiStatus === 'done' && assessment && (() => {
        const reco = RECO_STYLE[assessment.recommendation] ?? RECO_STYLE.REFER;
        return <div className="mt-4 flex flex-col gap-5">
            {/* Risk ring + recommendation + summary */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <ProgressRing percent={assessment.riskScore} size={112} stroke={11} color={riskColor(assessment.riskScore)} track="#eef2f6">
                <div className="text-2xl font-semibold tabular-nums text-[#101828]">{assessment.riskScore}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#98a2b3]">Risk score</div>
              </ProgressRing>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{
                backgroundColor: reco.bg,
                color: reco.text,
                boxShadow: `inset 0 0 0 1px ${reco.ring}`
              }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: reco.dot }} />
                  <span className="uppercase tracking-wide">{assessment.recommendation}</span>
                </span>
                {assessment.summary && <p className="mt-2 text-sm font-semibold text-[#101828]">{assessment.summary}</p>}
              </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#667085]">Recommended amount</div>
                <Money value={assessment.recommendedAmount} className="mt-1 block text-base font-semibold text-[#101828]" />
              </div>
              <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#667085]">Recommended rate</div>
                <div className="mt-1 text-base font-semibold tabular-nums text-[#101828]">{`${assessment.recommendedRate.toFixed(1)}%`}</div>
              </div>
              <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#667085]">DTI</div>
                <div className="mt-1 text-base font-semibold tabular-nums text-[#101828]">{`${assessment.debtToIncomeRatio.toFixed(1).replace(/\.0$/, '')}%`}</div>
              </div>
            </div>

            {/* Key factors */}
            {assessment.keyFactors?.length > 0 && <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Key factors</div>
              <ul className="mt-2 flex flex-col gap-2">
                {assessment.keyFactors.map((f, i) => <li key={i} className="flex items-start gap-2.5 rounded-xl border border-[#e6e9ef] px-3.5 py-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: IMPACT_COLOR[f.impact] ?? IMPACT_COLOR.NEUTRAL }} />
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold text-[#101828]">{f.factor}</span>
                    {f.detail && <span className="text-[#667085]"> — {f.detail}</span>}
                  </div>
                </li>)}
              </ul>
            </div>}

            {/* Red flags */}
            {assessment.redFlags?.length > 0 && <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#b45309]">
                <IconShield size={13} /> Red flags
              </div>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-[#92400e]">
                {assessment.redFlags.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>}

            {/* Rationale */}
            {assessment.rationale && <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Rationale</div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#475467]">{assessment.rationale}</p>
            </div>}

            {/* Prefill the officer's approve base — only while the control is live */}
            {isPending && <div>
              <Button variant="secondary" onClick={() => setBase(String(assessment.recommendedAmount))}>
                <IconCheckCircle size={16} />
                Use AI's recommendation ({fmtUSD(assessment.recommendedAmount)})
              </Button>
            </div>}
          </div>;
      })()}
      </Card>

      {isPending ? <Card className="p-6">
          <div className="text-sm font-semibold text-[#101828]">Decision</div>
          <p className="mt-1 text-sm text-[#667085]">
            Approve the full request or a partial base. The tier rate applies to the approved base; the borrower
            repays it in fixed monthly payments over their term.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Approved base amount" htmlFor="approvedBase" hint="Default is the full requested amount.">
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#667085]">
                  $
                </span>
                <input id="approvedBase" type="number" min={0} max={requested} step={500} value={baseRaw} onChange={e => setBase(e.target.value)} className={`${inputCls(false)} pl-7 text-lg font-semibold tabular-nums`} />
              
              </div>
            </Field>

            <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Resulting terms</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-xs text-[#667085]">Tier</div>
                  <div className="font-semibold text-[#101828]">{fmtPct(q.rate)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#667085]">Interest</div>
                  <Money value={q.interest} className="font-semibold text-[#101828]" />
                </div>
                <div>
                  <div className="text-xs text-[#667085]">Total to repay</div>
                  <Money value={q.total} className="font-semibold text-[#101828]" />
                </div>
              </div>
              <div className="mt-2 text-[11px] text-[#98a2b3]">
                Approves a principal of {fmtUSD(base)}; the borrower repays {fmtUSD(q.total)} (principal + interest {fmtUSD(q.interest)}) in fixed monthly payments over {application.termMonths} months.
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Button variant="success" block disabled={!valid || submitting} onClick={() => valid && onApprove(application.applicationId, base)}>
              <IconCheckCircle size={17} />
              {submitting ? 'Working…' : `Approve — ${fmtUSD(base)} principal`}
            </Button>
            <Button variant="danger" block disabled={submitting} onClick={() => onReject(application.applicationId)}>
              <IconX size={17} />
              Reject
            </Button>
          </div>
        </Card> : <Card className="p-6">
          <div className="text-sm font-semibold text-[#101828]">Decision recorded</div>
          {application.status === 'REJECTED' ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
              <IconX size={16} /> This application was rejected. No loan was created.
            </div> : (() => {
        const approved = application.approvedAmount ?? 0;
        const bd = quote(approved, application.termMonths);
        return <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[#e6e9ef] p-4">
                    <div className="text-[11px] uppercase tracking-wider text-[#667085]">Approved base</div>
                    <Money value={bd.principal} className="mt-1 block text-base font-semibold text-[#101828]" />
                  </div>
                  <div className="rounded-xl border border-[#e6e9ef] p-4">
                    <div className="text-[11px] uppercase tracking-wider text-[#667085]">Interest · {fmtPct(bd.rate)}</div>
                    <Money value={bd.interest} className="mt-1 block text-base font-semibold text-[#101828]" />
                  </div>
                  <div className="rounded-xl border border-[#e6e9ef] p-4">
                    <div className="text-[11px] uppercase tracking-wider text-[#667085]">Total to repay</div>
                    <Money value={bd.total} className="mt-1 block text-base font-semibold text-[#101828]" />
                  </div>
                </div>;
      })()}
          <div className="mt-4 flex justify-start">
            <Button variant="ghost" onClick={onBack}>
              <IconChevronLeft size={16} />
              Back to inbox
            </Button>
          </div>
        </Card>}
    </div>;
};