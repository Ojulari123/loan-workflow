import React from 'react';
import { Loan, LoanApplication, LoanPayment, fmtPct, quote, round2 } from '../model';
import { Card, Button, Money, StatusBadge } from '../primitives';
import { IconTrophy, IconRepay, IconCheck, IconChevronLeft } from '../icons';
export const PayoffScreen: React.FC<{
  loan: Loan;
  application: LoanApplication;
  payments: LoanPayment[];
  onBackToLoans: () => void;
  onRestart: () => void;
}> = ({
  loan,
  application,
  payments,
  onBackToLoans,
  onRestart
}) => {
  // Approved principal + the application's term feed the amortized quote, so the
  // principal / interest split matches what the borrower repaid.
  const principalBase = application.approvedAmount ?? loan.loanAmount;
  const bd = quote(principalBase, application.termMonths);
  const principal = bd.principal;
  const interest = bd.interest;
  const rate = bd.rate;
  const loanPayments = payments.filter(p => p.loanId === loan.id);
  const totalPaid = round2(loanPayments.reduce((sum, p) => sum + p.amountPaid, 0));
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="overflow-hidden">
        {/* Celebration header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f766e] via-[#15803d] to-[#166534] p-8 text-center text-white">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            {Array.from({
            length: 18
          }).map((_, i) => <span key={i} className="absolute block h-2 w-2 rounded-sm" style={{
            left: `${i * 53 % 100}%`,
            top: `${i * 37 % 100}%`,
            background: ['#fff', '#bbf7d0', '#a7f3d0'][i % 3],
            transform: `rotate(${i * 40 % 360}deg)`
          }} />)}
          </div>
          <div className="relative">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
              <IconTrophy size={30} />
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Loan paid off</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/85">
              {loan.applicantName}, your balance is $0.00. This loan is now closed.
            </p>
            <div className="mt-4 flex items-center justify-center">
              <StatusBadge status="PAID-OFF" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#e6e9ef] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Total principal</div>
              <Money value={principal} className="mt-1 block text-xl font-semibold text-[#101828]" />
            </div>
            <div className="rounded-xl border border-[#e6e9ef] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                Total interest · {fmtPct(rate)}
              </div>
              <Money value={interest} className="mt-1 block text-xl font-semibold text-[#101828]" />
            </div>
            <div className="rounded-xl border-2 border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#15803d]">Total repaid</div>
              <Money value={totalPaid} className="mt-1 block text-xl font-semibold text-[#15803d]" />
            </div>
          </div>

          {/* Ledger */}
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
              Payments ({loanPayments.length})
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {loanPayments.map((p, i) => <li key={p.id} className="flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2 text-sm">
                
                  <span className="flex items-center gap-2 text-[#475467]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0fdf4] text-[#16a34a]">
                      <IconCheck size={13} />
                    </span>
                    Payment {i + 1} · {new Date(p.paidAt).toLocaleDateString()}
                  </span>
                  <Money value={p.amountPaid} className="font-semibold text-[#101828]" />
                </li>)}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="secondary" onClick={onBackToLoans}>
              <IconChevronLeft size={16} />
              Back to my loans
            </Button>
            <Button variant="ghost" onClick={onRestart}>
              <IconRepay size={16} />
              Restart the demo
            </Button>
          </div>
        </div>
      </Card>
    </div>;
};