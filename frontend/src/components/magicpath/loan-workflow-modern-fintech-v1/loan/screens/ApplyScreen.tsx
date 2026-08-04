import React, { useMemo, useState } from 'react';
import { quote, fmtPct, fmtUSD, fmtUSD0, TERM_OPTIONS, DEFAULT_TERM_MONTHS } from '../model';
import { Card, Button, Field, inputCls, Money } from '../primitives';
import { IconArrowRight, IconChevronLeft, IconLock, IconCheck, IconShield } from '../icons';
export interface ApplyForm {
  name: string;
  email: string;
  accountBalance: number;
  amountRequested: number;
  loanPurpose: string;
  termMonths: number;
  annualIncome: number;
  monthlyDebt: number;
  employmentStatus: string;
}

// Exactly the backend's email rule.
const EMAIL_RE = /^[A-Za-z0-9+_.-]+@(.+)$/;

// Options the AI underwriter reasons over. Defaults are the first entry so a
// valid value always flows to the backend without extra required-field friction.
const LOAN_PURPOSES = ['Debt consolidation', 'Home improvement', 'Auto', 'Medical', 'Business', 'Education', 'Other'];
const EMPLOYMENT_STATUSES = ['Employed', 'Self-employed', 'Unemployed', 'Retired', 'Student'];
const WIZARD = [{
  key: 'amount',
  label: 'Amount'
}, {
  key: 'details',
  label: 'Your details'
}, {
  key: 'review',
  label: 'Review & confirm'
}];
const MIN = 500;
const MAX = 100000;
export const ApplyScreen: React.FC<{
  initialAmount: number;
  onSubmit: (form: ApplyForm) => void;
  onBack: () => void;
  submitting?: boolean;
}> = ({
  initialAmount,
  onSubmit,
  onBack,
  submitting = false
}) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [amountRequested, setAmountRequested] = useState(String(initialAmount));
  const [loanPurpose, setLoanPurpose] = useState(LOAN_PURPOSES[0]);
  const [termMonths, setTermMonths] = useState(DEFAULT_TERM_MONTHS);
  const [annualIncome, setAnnualIncome] = useState('');
  const [monthlyDebt, setMonthlyDebt] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState(EMPLOYMENT_STATUSES[0]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    e.name = name.trim().length === 0 ? 'Please enter your full name.' : null;
    e.email = !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : null;
    const bal = Number(accountBalance);
    e.accountBalance = accountBalance.trim() === '' || Number.isNaN(bal) ? 'Enter your account balance.' : bal <= 0 ? 'Account balance must be greater than 0.' : null;
    const amt = Number(amountRequested);
    e.amountRequested = amountRequested.trim() === '' || Number.isNaN(amt) ? 'Enter an amount.' : amt <= 0 ? 'Amount requested must be greater than 0.' : null;
    const inc = Number(annualIncome);
    e.annualIncome = annualIncome.trim() === '' || Number.isNaN(inc) ? 'Enter your annual income.' : inc < 0 ? 'Annual income must be 0 or more.' : null;
    const debt = Number(monthlyDebt);
    e.monthlyDebt = monthlyDebt.trim() === '' || Number.isNaN(debt) ? 'Enter your monthly debt payments.' : debt < 0 ? 'Monthly debt must be 0 or more.' : null;
    return e;
  }, [name, email, accountBalance, amountRequested, annualIncome, monthlyDebt]);
  const amountValid = !errors.amountRequested;
  const detailsValid = !errors.name && !errors.email && !errors.accountBalance && !errors.annualIncome && !errors.monthlyDebt;
  const show = (k: string) => touched[k] || false;
  const markTouched = (...keys: string[]) => setTouched(t => ({
    ...t,
    ...Object.fromEntries(keys.map(k => [k, true]))
  }));
  const amtNum = Number(amountRequested) || 0;
  const q = useMemo(() => quote(amtNum, termMonths), [amtNum, termMonths]);
  // Clamp the requested amount to [MIN, MAX] — applied ONLY on blur and when the
  // user advances/submits, so typing (incl. temporarily-below-MIN or empty) is free.
  const clampAmountValue = () => {
    const n = Number(amountRequested);
    const base = amountRequested.trim() === '' || Number.isNaN(n) ? MIN : n;
    return Math.max(MIN, Math.min(MAX, Math.round(base)));
  };
  const clampAmount = () => setAmountRequested(String(clampAmountValue()));
  const next = () => {
    if (step === 0) {
      markTouched('amountRequested');
      clampAmount();
      setStep(1);
    } else if (step === 1) {
      markTouched('name', 'email', 'accountBalance', 'annualIncome', 'monthlyDebt');
      if (detailsValid) setStep(2);
    }
  };
  const confirm = () => {
    markTouched('name', 'email', 'accountBalance', 'amountRequested', 'annualIncome', 'monthlyDebt');
    const clampedAmount = clampAmountValue();
    setAmountRequested(String(clampedAmount));
    if (detailsValid) {
      onSubmit({
        name: name.trim(),
        email: email.trim(),
        accountBalance: Number(accountBalance),
        amountRequested: clampedAmount,
        loanPurpose,
        termMonths,
        annualIncome: Number(annualIncome),
        monthlyDebt: Number(monthlyDebt),
        employmentStatus
      });
    }
  };
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Labeled step indicator */}
      <div className="flex items-center gap-3">
        {WIZARD.map((w, i) => {
        const done = i < step;
        const active = i === step;
        return <React.Fragment key={w.key}>
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${done ? 'bg-[#2563eb] text-white' : active ? 'bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#2563eb]' : 'bg-[#f2f4f7] text-[#98a2b3]'}`}>
                  
                  {done ? <IconCheck size={14} /> : i + 1}
                </span>
                <span className={`hidden text-sm font-medium sm:inline ${active ? 'text-[#101828]' : done ? 'text-[#475467]' : 'text-[#98a2b3]'}`}>
                  
                  {w.label}
                </span>
              </div>
              {i < WIZARD.length - 1 && <div className="h-px flex-1 bg-[#e6e9ef]" />}
            </React.Fragment>;
      })}
      </div>

      <Card className="p-6 sm:p-8">
        {/* STEP 0 — amount */}
        {step === 0 && <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#101828]">How much do you need?</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Choose the amount to request. You'll see the interest tier and total before you confirm.
              </p>
            </div>

            <Field label="Amount requested" htmlFor="amountRequested" hint={`Between ${fmtUSD0(MIN)} and ${fmtUSD0(MAX)}. Must be greater than $0.`} error={show('amountRequested') ? errors.amountRequested : null}>
            
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[#667085]">
                  $
                </span>
                <input id="amountRequested" type="number" min={0} step={500} placeholder="15,000" value={amountRequested} onChange={e => setAmountRequested(e.target.value)} onBlur={() => {
                markTouched('amountRequested');
                clampAmount();
              }} className={`${inputCls(show('amountRequested') && !!errors.amountRequested)} pl-7 text-2xl font-semibold tabular-nums`} />
              
              </div>
            </Field>

            <Field label="Loan purpose" htmlFor="loanPurpose" hint="What the funds are for. Helps Northline's underwriter assess your request.">
              <select id="loanPurpose" value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} className={inputCls(false)}>
                {LOAN_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Repayment term" htmlFor="termMonths" hint="How long you'll take to repay. Your estimated monthly payment updates below.">
              <select id="termMonths" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className={inputCls(false)}>
                {TERM_OPTIONS.map(t => <option key={t} value={t}>{t} months</option>)}
              </select>
            </Field>

            {amountValid && amtNum > 0 && <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                  If approved at this amount
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-[#667085]">Estimated monthly payment</span>
                  <span className="text-2xl font-semibold tabular-nums tracking-tight text-[#101828]">
                    {fmtUSD(q.monthly)}
                    <span className="ml-1 text-sm font-medium text-[#667085]">/ mo for {q.termMonths} months</span>
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#667085]">Interest tier</div>
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
              </div>}

            <div className="mt-1 flex items-center justify-between">
              <Button variant="ghost" onClick={onBack}>
                <IconChevronLeft size={16} />
                Home
              </Button>
              <Button onClick={next}>
                Continue
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>}

        {/* STEP 1 — details */}
        {step === 1 && <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Tell us about you</h2>
              <p className="mt-1 text-sm text-[#667085]">
                We use this to create your applicant profile with Northline.
              </p>
            </div>

            <Field label="Full name" htmlFor="name" error={show('name') ? errors.name : null}>
              <input id="name" type="text" placeholder="Jordan Rivera" value={name} onChange={e => setName(e.target.value)} onBlur={() => markTouched('name')} className={inputCls(show('name') && !!errors.name)} />
            
            </Field>

            <Field label="Email address" htmlFor="email" error={show('email') ? errors.email : null}>
              <input id="email" type="email" inputMode="email" placeholder="jordan@example.com" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => markTouched('email')} className={inputCls(show('email') && !!errors.email)} />
            
            </Field>

            <Field label="Account balance" htmlFor="accountBalance" hint="Your current balance on file. Must be greater than $0." error={show('accountBalance') ? errors.accountBalance : null}>
            
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#667085]">
                  $
                </span>
                <input id="accountBalance" type="number" min={0} step={100} placeholder="5,000" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} onBlur={() => markTouched('accountBalance')} className={`${inputCls(show('accountBalance') && !!errors.accountBalance)} pl-7 tabular-nums`} />

              </div>
            </Field>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Annual income" htmlFor="annualIncome" hint="Gross yearly income before tax." error={show('annualIncome') ? errors.annualIncome : null}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#667085]">
                    $
                  </span>
                  <input id="annualIncome" type="number" min={0} step={1000} placeholder="72,000" value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} onBlur={() => markTouched('annualIncome')} className={`${inputCls(show('annualIncome') && !!errors.annualIncome)} pl-7 tabular-nums`} />
                </div>
              </Field>

              <Field label="Monthly debt payments" htmlFor="monthlyDebt" hint="Total of your current monthly debt obligations." error={show('monthlyDebt') ? errors.monthlyDebt : null}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#667085]">
                    $
                  </span>
                  <input id="monthlyDebt" type="number" min={0} step={50} placeholder="450" value={monthlyDebt} onChange={e => setMonthlyDebt(e.target.value)} onBlur={() => markTouched('monthlyDebt')} className={`${inputCls(show('monthlyDebt') && !!errors.monthlyDebt)} pl-7 tabular-nums`} />
                </div>
              </Field>
            </div>

            <Field label="Employment status" htmlFor="employmentStatus">
              <select id="employmentStatus" value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value)} className={inputCls(false)}>
                {EMPLOYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <div className="mt-1 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <IconChevronLeft size={16} />
                Back
              </Button>
              <Button onClick={next}>
                Continue
                <IconArrowRight size={16} />
              </Button>
            </div>
          </div>}

        {/* STEP 2 — review & confirm */}
        {step === 2 && <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Review &amp; confirm</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Check your details, then send your request to the Northline team.
              </p>
            </div>

            <div className="divide-y divide-[#e6e9ef] rounded-xl border border-[#e6e9ef]">
              {[['Name', name.trim()], ['Email', email.trim()], ['Account balance', fmtUSD(Number(accountBalance) || 0)], ['Annual income', fmtUSD(Number(annualIncome) || 0)], ['Monthly debt', fmtUSD(Number(monthlyDebt) || 0)], ['Employment', employmentStatus], ['Amount requested', fmtUSD(amtNum)], ['Loan purpose', loanPurpose], ['Repayment term', `${termMonths} months`]].map(([k, v]) => <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-[#667085]">{k}</span>
                  <span className="font-semibold tabular-nums text-[#101828]">{v}</span>
                </div>)}
            </div>

            <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                Estimated terms (subject to review)
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#667085]">Estimated monthly payment</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-[#101828]">
                  {fmtUSD(q.monthly)}
                  <span className="ml-1 text-sm font-medium text-[#667085]">/ mo for {q.termMonths} months</span>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
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
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3 text-xs leading-relaxed text-[#92400e]">
              <IconShield size={15} className="mt-0.5 shrink-0" />
              <span>
                This is a <span className="font-semibold">request</span>, not an approval. A Northline loan officer reviews every application — final amount and terms are set by staff, not automatically.
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <Button block onClick={confirm} disabled={submitting} className="py-3 text-base">
                <IconCheck size={18} />
                {submitting ? 'Submitting…' : 'Confirm — I want this loan'}
              </Button>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <IconChevronLeft size={16} />
                  Back
                </Button>
              </div>
            </div>
          </div>}
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[#98a2b3]">
        <IconLock size={13} />
        Sent securely to the Northline team for review.
      </p>
    </div>;
};