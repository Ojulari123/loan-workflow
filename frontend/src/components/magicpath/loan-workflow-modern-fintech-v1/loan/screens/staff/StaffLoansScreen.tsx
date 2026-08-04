import React from 'react';
import { Loan, LoanApplication, fmtUSD, fmtPct, quote } from '../../model';
import { Card, Money, StatusBadge, StatTile } from '../../primitives';
import { IconLayers } from '../../icons';
export const StaffLoansScreen: React.FC<{
  loans: Loan[];
  applications: LoanApplication[];
}> = ({
  loans,
  applications
}) => {
  const appFor = (id: string) => applications.find(a => a.applicationId === id);
  const sorted = [...loans].sort((a, b) => a.issuedAt < b.issuedAt ? 1 : -1);
  const totalBook = loans.reduce((s, l) => s + l.loanAmount, 0);
  const outstanding = loans.reduce((s, l) => {
    const app = appFor(l.loanApplicationId);
    return s + (app?.remainingBalance ?? l.loanAmount);
  }, 0);
  return <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Loans overview</h2>
        <p className="mt-1 text-sm text-[#667085]">Read-only view of every approved loan and its repayment progress.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Loans issued" sub="Approved & funded">
          {loans.length}
        </StatTile>
        <StatTile label="Total book" sub="Sum of loan amounts">
          {fmtUSD(totalBook)}
        </StatTile>
        <StatTile label="Outstanding" sub="Remaining to be repaid">
          {fmtUSD(outstanding)}
        </StatTile>
      </div>

      <Card className="overflow-hidden">
        {sorted.length === 0 ? <div className="flex flex-col items-center gap-2 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f4f7] text-[#98a2b3]">
              <IconLayers size={22} />
            </span>
            <p className="text-sm text-[#667085]">No loans issued yet.</p>
          </div> : <ul className="divide-y divide-[#e6e9ef]">
            {sorted.map(loan => {
          const app = appFor(loan.loanApplicationId);
          const remaining = app?.remainingBalance ?? loan.loanAmount;
          const pct = loan.loanAmount > 0 ? (loan.loanAmount - remaining) / loan.loanAmount * 100 : 0;
          // Correlate loan → application to get the approved principal + term, then
          // amortize: principal + interest === quote.total === loan.loanAmount.
          const bd = quote(app?.approvedAmount ?? loan.loanAmount, app?.termMonths);
          return <li key={loan.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#101828]">{loan.applicantName}</span>
                      <StatusBadge status={loan.status} size="sm" />
                    </div>
                    <div className="text-sm text-[#667085]">
                      <Money value={remaining} className="font-semibold text-[#101828]" /> of {fmtUSD(loan.loanAmount)}
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#f2f4f7]">
                    <div className="h-full rounded-full bg-[#2563eb] transition-all duration-500" style={{
                width: `${pct}%`
              }} />
                  
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-[#98a2b3]">
                    <span>
                      Principal {fmtUSD(bd.principal)} · interest {fmtUSD(bd.interest)} ({fmtPct(bd.rate)})
                    </span>
                    <span className="tabular-nums">{pct.toLocaleString('en-US', {
                  maximumFractionDigits: 0
                })}% repaid</span>
                  </div>
                </li>;
        })}
          </ul>}
      </Card>
    </div>;
};