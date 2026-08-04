import React from 'react';
import { LoanApplication, Loan, fmtWhen } from '../../model';
import { Card, Money, StatusBadge, StatTile } from '../../primitives';
import { IconChevronRight, IconInbox, IconBell } from '../../icons';
import { FirstVisitTip } from '../../onboarding/FirstVisitTip';
export const StaffInboxScreen: React.FC<{
  applications: LoanApplication[];
  loans: Loan[];
  onOpen: (applicationId: string) => void;
}> = ({
  applications,
  loans,
  onOpen
}) => {
  const pending = applications.filter(a => a.status === 'PENDING');
  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  // Pending first, then newest.
  const sorted = [...applications].sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  return <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Applications inbox</h2>
          <p className="mt-1 text-sm text-[#667085]">Review incoming loan requests and decide on each one.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6e9ef] bg-white text-[#475467]">
            <IconBell size={17} />
            {pending.length > 0 && <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold leading-none text-white">
                {pending.length}
              </span>}
          </span>
        </div>
      </div>

      {/* First-visit coaching for the staff inbox */}
      <FirstVisitTip tipKey="tip-staff-inbox" title="Reviewing applications" tone="neutral">
        Pending requests sit at the top. Open one to run the AI underwriter, then approve or reject it.
      </FirstVisitTip>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total applications" sub="All time">
          {applications.length}
        </StatTile>
        <StatTile label="Pending review" sub="Awaiting a decision" emphasis accent="linear-gradient(135deg,#d97706,#b45309)">
          {pending.length}
        </StatTile>
        <StatTile label="Active loans" sub="Approved & funded">
          {activeLoans.length}
        </StatTile>
      </div>

      {/* Applications table */}
      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-3 border-b border-[#e6e9ef] bg-[#f8fafc] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#667085] sm:grid">
          <span>Applicant</span>
          <span>Requested</span>
          <span>Status</span>
          <span>Applied</span>
          <span />
        </div>
        {sorted.length === 0 ? <div className="flex flex-col items-center gap-2 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2f4f7] text-[#98a2b3]">
              <IconInbox size={22} />
            </span>
            <p className="text-sm text-[#667085]">No applications yet.</p>
          </div> : <ul className="divide-y divide-[#e6e9ef]">
            {sorted.map(app => {
          const isPending = app.status === 'PENDING';
          return <li key={app.applicationId} onClick={() => onOpen(app.applicationId)} className="grid cursor-pointer grid-cols-2 items-center gap-2 px-5 py-4 transition-colors hover:bg-[#f8fafc] sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] sm:gap-3">
                
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#101828]">{app.applicantName}</div>
                    <div className="truncate text-xs text-[#98a2b3]">{app.applicationId}</div>
                  </div>
                  <div className="min-w-0">
                    <Money value={app.amountRequested} className="block text-sm font-semibold text-[#101828]" />
                    <div className="text-xs tabular-nums text-[#98a2b3]">{app.termMonths} mo term</div>
                  </div>
                  <div className="justify-self-start">
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                  <div className="hidden text-xs text-[#667085] sm:block">{fmtWhen(app.createdAt)}</div>
                  <div className="justify-self-end">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isPending ? 'text-[#2563eb]' : 'text-[#98a2b3]'}`}>
                    
                      {isPending ? 'Review' : 'View'}
                      <IconChevronRight size={15} />
                    </span>
                  </div>
                </li>;
        })}
          </ul>}
      </Card>
    </div>;
};