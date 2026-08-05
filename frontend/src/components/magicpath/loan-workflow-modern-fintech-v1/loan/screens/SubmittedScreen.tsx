import React, { useEffect, useState } from 'react';
import { LoanApplication, fmtWhen } from '../model';
import { Card, Button, Money, StatusBadge, Stepper, Step } from '../primitives';
import { IconArrowRight, IconClock, IconShield, IconHome } from '../icons';
const TRACK: Step[] = [{
  key: 'submitted',
  label: 'Submitted'
}, {
  key: 'verifying',
  label: 'Verifying'
}, {
  key: 'review',
  label: 'Officer review'
}, {
  key: 'decision',
  label: 'Decision'
}];
export const SubmittedScreen: React.FC<{
  application: LoanApplication;
  onViewMyLoans: () => void;
  onHome: () => void;
}> = ({
  application,
  onViewMyLoans,
  onHome
}) => {
  // Ambient progress up to (not including) the decision — the customer never
  // makes the decision; they wait for staff.
  const [stage, setStage] = useState(1);
  useEffect(() => {
    const timers = [window.setTimeout(() => setStage(2), 900)];
    return () => timers.forEach(clearTimeout);
  }, []);
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="overflow-hidden">
        <div className="border-b border-[#e6e9ef] bg-[#f8fafc] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706]">
                <IconClock size={22} />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[#101828]">Application received</h2>
                <p className="text-sm text-[#667085]">Ref {application.applicationId}</p>
              </div>
            </div>
            <StatusBadge status={application.status} />
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm leading-relaxed text-[#475467]">
            Thanks, <span className="font-semibold text-[#101828]">{application.applicantName}</span>. Your
            application is <span className="font-semibold text-[#101828]">under review by the Northline team</span>.
            A loan officer will verify your details and decide on your request. You'll see the outcome here in{' '}
            <span className="font-medium">My loans</span>.
          </p>

          <div className="mt-5 rounded-xl border border-[#e6e9ef] p-5">
            <Stepper steps={TRACK} current={stage} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e6e9ef] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                Amount requested
              </div>
              <Money value={application.amountRequested} className="mt-1 block text-xl font-semibold text-[#101828]" />
            </div>
            <div className="rounded-xl border border-[#e6e9ef] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Submitted</div>
              <div className="mt-1 text-xl font-semibold text-[#101828]">{fmtWhen(application.createdAt)}</div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-3 text-xs leading-relaxed text-[#1e40af]">
            <IconShield size={15} className="mt-0.5 shrink-0" />
            Only Northline staff can approve or reject an application. There's nothing more for you to do right now.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={onHome}>
              <IconHome size={16} />
              Back to home
            </Button>
            <Button onClick={onViewMyLoans}>
              View my loans
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>;
};