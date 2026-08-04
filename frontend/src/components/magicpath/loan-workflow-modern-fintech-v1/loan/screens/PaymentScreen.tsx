import React, { useMemo, useState } from 'react';
import { fmtUSD, round2 } from '../model';
import { Card, Button, Money, Field, inputCls } from '../primitives';
import { IconChevronLeft, IconWallet, IconInfo, IconCheckCircle } from '../icons';
export const PaymentScreen: React.FC<{
  remainingBalance: number;
  onSubmit: (amount: number) => void;
  onBack: () => void;
  submitting?: boolean;
}> = ({
  remainingBalance,
  onSubmit,
  onBack,
  submitting = false
}) => {
  const [raw, setRaw] = useState('');
  const [capped, setCapped] = useState(false);

  // Client-side guard: never allow more than the remaining balance.
  const setAmount = (value: string) => {
    if (value === '') {
      setRaw('');
      setCapped(false);
      return;
    }
    let n = Number(value);
    if (Number.isNaN(n)) return;
    if (n < 0) n = 0;
    if (n > remainingBalance) {
      n = remainingBalance;
      setCapped(true);
    } else {
      setCapped(false);
    }
    setRaw(String(n));
  };
  const amount = Math.max(0, Math.min(remainingBalance, Number(raw) || 0));
  const newRemaining = useMemo(() => round2(remainingBalance - amount), [remainingBalance, amount]);
  const willPayOff = amount > 0 && newRemaining <= 0;
  const valid = amount > 0;
  const quickPercents = [0.25, 0.5, 1];
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Make a payment</h2>
        <p className="mt-1 text-sm text-[#667085]">
          Payments reduce your balance directly. You can't pay more than you owe.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between rounded-xl border border-[#e6e9ef] bg-[#f8fafc] px-4 py-3">
          <span className="text-sm text-[#667085]">Current balance</span>
          <Money value={remainingBalance} className="text-lg font-semibold text-[#101828]" />
        </div>

        <div className="mt-5">
          <Field label="Payment amount" htmlFor="payAmount" error={capped ? `Capped at your balance of ${fmtUSD(remainingBalance)}.` : null} hint={!capped ? 'Enter any amount up to your remaining balance.' : undefined}>
            
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[#667085]">
                $
              </span>
              <input id="payAmount" type="number" min={0} max={remainingBalance} step={50} placeholder="0.00" value={raw} onChange={e => setAmount(e.target.value)} className={`${inputCls(false)} pl-8 text-2xl font-semibold tabular-nums`} />
              
            </div>
          </Field>

          {/* Quick amounts */}
          <div className="mt-3 flex flex-wrap gap-2">
            {quickPercents.map(p => <button key={p} type="button" onClick={() => setAmount(String(round2(remainingBalance * p)))} className="rounded-lg border border-[#d0d5dd] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb]">
              
                {p === 1 ? 'Pay in full' : `${p * 100}%`}
              </button>)}
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-6 rounded-xl border border-[#e6e9ef] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">After this payment</div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-xs text-[#667085]">New remaining balance</div>
              <div className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight text-[#101828]">
                {fmtUSD(newRemaining)}
              </div>
            </div>
            {willPayOff && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0fdf4] px-2.5 py-1 text-xs font-semibold text-[#15803d] ring-1 ring-[#bbf7d0]">
                <IconCheckCircle size={14} />
                Pays off loan
              </span>}
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#f2f4f7]">
            <div className="h-full rounded-full bg-[#2563eb] transition-all duration-300" style={{
            width: `${remainingBalance > 0 ? (remainingBalance - newRemaining) / remainingBalance * 100 : 0}%`
          }} />
            
          </div>
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#667085]">
          <IconInfo size={13} className="mt-0.5 shrink-0 text-[#98a2b3]" />
          Interest was fixed at approval and is already included in your balance — it never grows.
        </p>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <IconChevronLeft size={16} />
            Back to loan
          </Button>
          <Button onClick={() => valid && onSubmit(amount)} disabled={!valid || submitting}>
            <IconWallet size={16} />
            {submitting ? 'Processing…' : `Pay ${amount > 0 ? fmtUSD(amount) : ''}`}
          </Button>
        </div>
      </Card>
    </div>;
};