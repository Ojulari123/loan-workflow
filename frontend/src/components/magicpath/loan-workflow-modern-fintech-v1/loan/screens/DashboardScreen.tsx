import React from 'react';
import { Loan, LoanApplication, LoanPayment, fmtUSD, fmtPct, recoverBase, round2 } from '../model';
import { Card, Button, Money, StatusBadge, StatTile, ProgressRing } from '../primitives';
import { IconWallet, IconArrowRight, IconRepay } from '../icons';
export const DashboardScreen: React.FC<{
  loan: Loan;
  application: LoanApplication;
  payments: LoanPayment[];
  onPay: () => void;
}> = ({
  loan,
  application,
  payments,
  onPay
}) => {
  const loanAmount = loan.loanAmount; // == approvedAmount == total to repay
  const remaining = application.remainingBalance ?? loanAmount;
  // Recover principal / interest from the stored approvedAmount so the breakdown
  // is correct even when staff approved a PARTIAL base (< amountRequested).
  const bd = recoverBase(loanAmount);
  const principal = bd.base;
  const interest = bd.interest;
  const rate = bd.rate;
  const repaid = round2(loanAmount - remaining);
  const pctRepaid = loanAmount > 0 ? repaid / loanAmount * 100 : 0;
  const loanPayments = payments.filter(p => p.loanId === loan.id);
  return <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Your loan</h2>
          <p className="mt-1 text-sm text-[#667085]">
            {loan.applicantName} · Loan {loan.id}
          </p>
        </div>
        <StatusBadge status={loan.status} />
      </div>

      {/* Stat tiles — remaining balance dominates */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Remaining balance" emphasis sub="Amount left to repay">
          {fmtUSD(remaining)}
        </StatTile>
        <StatTile label="Original loan amount" sub="Principal + interest">
          {fmtUSD(loanAmount)}
        </StatTile>
        <StatTile label="Interest rate" sub={`${bd.tier.label} · ${bd.tier.range}`}>
          {fmtPct(rate)}
        </StatTile>
        <StatTile label="Loan status" sub={`Issued ${new Date(loan.issuedAt).toLocaleDateString()}`}>
          <StatusBadge status={loan.status} />
        </StatTile>
      </div>

      {/* Payoff ring + breakdown */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="flex flex-col items-center justify-center gap-4 p-6">
          <div className="self-start text-sm font-semibold text-[#101828]">Payoff progress</div>
          <ProgressRing percent={pctRepaid} size={184}>
            <span className="text-3xl font-semibold tabular-nums text-[#101828]">
              {pctRepaid.toLocaleString('en-US', {
              maximumFractionDigits: 1
            })}%
            </span>
            <span className="mt-0.5 text-xs text-[#667085]">repaid</span>
          </ProgressRing>
          <div className="flex w-full items-center justify-between text-sm">
            <span className="text-[#667085]">Repaid</span>
            <Money value={repaid} className="font-semibold text-[#101828]" />
          </div>
          <div className="h-px w-full bg-[#e6e9ef]" />
          <div className="flex w-full items-center justify-between text-sm">
            <span className="text-[#667085]">Remaining</span>
            <Money value={remaining} className="font-semibold text-[#101828]" />
          </div>
        </Card>

        <Card className="flex flex-col p-6">
          <div className="text-sm font-semibold text-[#101828]">Balance breakdown</div>

          {/* Principal vs interest bar */}
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f2f4f7]">
              <div className="h-full bg-[#2563eb]" style={{
              width: `${principal / loanAmount * 100}%`
            }} title="Principal" />
              <div className="h-full bg-[#93c5fd]" style={{
              width: `${interest / loanAmount * 100}%`
            }} title="Interest" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#e6e9ef] p-3">
                <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                  <span className="h-2 w-2 rounded-full bg-[#2563eb]" /> Principal
                </div>
                <Money value={principal} className="mt-1 block text-lg font-semibold text-[#101828]" />
              </div>
              <div className="rounded-lg border border-[#e6e9ef] p-3">
                <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                  <span className="h-2 w-2 rounded-full bg-[#93c5fd]" /> Interest ({fmtPct(rate)})
                </div>
                <Money value={interest} className="mt-1 block text-lg font-semibold text-[#101828]" />
              </div>
            </div>
          </div>

          {/* Recent payments */}
          <div className="mt-5 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#667085]">Payment history</div>
            {loanPayments.length === 0 ? <p className="mt-2 text-sm text-[#98a2b3]">No payments yet. Make your first payment below.</p> : <ul className="mt-2 flex flex-col gap-1.5">
                {loanPayments.slice().reverse().map(p => <li key={p.id} className="flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2 text-sm">
                
                      <span className="flex items-center gap-2 text-[#475467]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
                          <IconWallet size={13} />
                        </span>
                        {new Date(p.paidAt).toLocaleString()}
                      </span>
                      <span className="text-right">
                        <Money value={p.amountPaid} className="font-semibold text-[#101828]" />
                        <span className="ml-2 text-xs text-[#98a2b3]">bal {fmtUSD(p.remainingBalance)}</span>
                      </span>
                    </li>)}
              </ul>}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button block onClick={onPay} className="py-3 text-base">
              <IconRepay size={18} />
              Make a payment
              <IconArrowRight size={18} />
            </Button>
          </div>
        </Card>
      </div>
    </div>;
};