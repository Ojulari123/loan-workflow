import React from 'react';
import { LoanApplication, Loan, fmtUSD, fmtWhen, quote } from '../model';
import { Card, Button, StatusBadge } from '../primitives';
import { IconArrowRight, IconClock, IconX, IconCheckCircle, IconApply, IconChevronRight } from '../icons';
export const MyLoansScreen: React.FC<{
  applications: LoanApplication[];
  loans: Loan[];
  onManage: (applicationId: string) => void;
  onApplyNew: () => void;
}> = ({
  applications,
  loans,
  onManage,
  onApplyNew
}) => {
  const sorted = [...applications].sort((a, b) => a.createdAt < b.createdAt ? 1 : -1);
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#101828]">My loans</h2>
          <p className="mt-1 text-sm text-[#667085]">Your requests and their live status from the Northline team.</p>
        </div>
        <Button variant="secondary" onClick={onApplyNew}>
          <IconApply size={16} />
          New request
        </Button>
      </div>

      {sorted.length === 0 ? <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
            <IconApply size={22} />
          </span>
          <div className="text-sm font-semibold text-[#101828]">No requests yet</div>
          <p className="max-w-xs text-sm text-[#667085]">Start a request and it'll show up here with a live status.</p>
          <Button onClick={onApplyNew} className="mt-1">
            Apply now
            <IconArrowRight size={16} />
          </Button>
        </Card> : <div className="flex flex-col gap-3">
          {sorted.map(app => {
        const loan = loans.find(l => l.loanApplicationId === app.applicationId);
        const approved = app.approvedAmount ?? 0;
        const bd = app.approvedAmount != null ? quote(approved, app.termMonths) : null;
        // Amortized total to repay (principal + interest). This equals the loan's
        // original/remaining balance from the backend, so it — not the principal —
        // is the headline amount, the "of X" denominator and the progress base.
        const total = bd ? bd.total : approved;
        const remaining = app.remainingBalance ?? total;
        const pct = total > 0 ? Math.min(100, Math.max(0, (total - remaining) / total * 100)) : 0;
        const clickable = app.status === 'APPROVED' || app.status === 'PAID-OFF';
        return <Card key={app.applicationId} className={`p-5 transition-shadow ${clickable ? 'cursor-pointer hover:shadow-[0_2px_4px_rgba(16,24,40,0.06),0_12px_28px_-12px_rgba(16,24,40,0.18)]' : ''}`} onClick={clickable ? () => onManage(app.applicationId) : undefined}>
              
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.status} />
                      <span className="text-xs text-[#98a2b3]">Ref {app.applicationId}</span>
                    </div>
                    <div className="mt-2 text-sm text-[#667085]">
                      {app.status === 'PENDING' ? 'Requested' : 'Loan amount'}
                    </div>
                    <div className="text-2xl font-semibold tabular-nums tracking-tight text-[#101828]">
                      {fmtUSD(app.status === 'PENDING' ? app.amountRequested : total)}
                    </div>
                  </div>
                  {clickable && <IconChevronRight size={20} className="mt-1 text-[#98a2b3]" />}
                </div>

                {/* Status-specific detail */}
                {app.status === 'PENDING' && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fffbeb] px-3 py-2 text-xs font-medium text-[#b45309]">
                    <IconClock size={14} />
                    Under review by the Northline team · submitted {fmtWhen(app.createdAt)}
                  </div>}

                {app.status === 'REJECTED' && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#b91c1c]">
                    <IconX size={14} />
                    Not approved. No loan was created and no interest was charged.
                  </div>}

                {(app.status === 'APPROVED' || app.status === 'PAID-OFF') && bd && <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-[#667085]">
                      <span>
                        {app.status === 'PAID-OFF' ? 'Fully repaid' : 'Remaining'}{' '}
                        <span className="font-semibold text-[#344054]">{fmtUSD(remaining)}</span> of {fmtUSD(total)}
                      </span>
                      <span className="tabular-nums font-semibold text-[#344054]">
                        {pct.toLocaleString('en-US', {
                  maximumFractionDigits: 0
                })}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#f2f4f7]">
                      <div className="h-full rounded-full bg-[#2563eb] transition-all duration-500" style={{
                width: `${pct}%`
              }} />
                  
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#667085]">
                        {app.status === 'PAID-OFF' ? <>
                            <IconCheckCircle size={14} className="text-[#16a34a]" /> Loan closed
                          </> : <>Interest {fmtUSD(bd.interest)} · principal {fmtUSD(bd.principal)}</>}
                      </span>
                      <Button variant="secondary" onClick={() => onManage(app.applicationId)}>
                        {app.status === 'PAID-OFF' ? 'View summary' : 'Manage loan'}
                        <IconArrowRight size={15} />
                      </Button>
                    </div>
                  </div>}
              </Card>;
      })}
        </div>}
    </div>;
};