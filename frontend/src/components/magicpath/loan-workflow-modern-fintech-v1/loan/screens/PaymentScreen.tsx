import React, { useEffect, useMemo, useState } from 'react';
import { fmtUSD, round2, LoanPayment } from '../model';
import { Card, Button, Money, Field, inputCls } from '../primitives';
import { IconChevronLeft, IconWallet, IconInfo, IconCheckCircle } from '../icons';
import { FirstVisitTip } from '../onboarding/FirstVisitTip';
import * as api from '@/lib/api';
export const PaymentScreen: React.FC<{
  applicantId: string;
  remainingBalance: number;
  onSubmit: (amount: number) => Promise<LoanPayment | void>;
  onBack: () => void;
  submitting?: boolean;
}> = ({
  applicantId,
  remainingBalance,
  onSubmit,
  onBack,
  submitting = false
}) => {
  const [raw, setRaw] = useState('');
  const [capped, setCapped] = useState(false);

  // ---- Live account balance ------------------------------------------------
  // Payments draw from (and are capped by) the applicant's account balance, so
  // fetch the authoritative copy on open and keep it in local state. It updates
  // from the deposit + payment responses so the borrower sees money move live.
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api.getApplicantById(applicantId)
      .then(a => { if (active) setAccountBalance(a.accountBalance); })
      .catch(() => { if (active) setBalanceError('Could not load your account balance.'); });
    return () => { active = false; };
  }, [applicantId]);

  const balanceKnown = accountBalance != null;
  // You can pay at most the lesser of what you owe and what's in your account.
  // Until the balance loads we fall back to the loan remaining (the backend
  // still enforces the account-balance cap server-side).
  const available = round2(balanceKnown ? Math.min(remainingBalance, accountBalance) : remainingBalance);
  const shortOnFunds = balanceKnown && accountBalance < remainingBalance;

  // Client-side guard: never allow more than the available amount.
  const setAmount = (value: string) => {
    if (value === '') {
      setRaw('');
      setCapped(false);
      return;
    }
    let n = Number(value);
    if (Number.isNaN(n)) return;
    if (n < 0) n = 0;
    if (n > available) {
      n = available;
      setCapped(true);
    } else {
      setCapped(false);
    }
    setRaw(String(n));
  };
  const amount = Math.max(0, Math.min(available, Number(raw) || 0));
  const newRemaining = useMemo(() => round2(remainingBalance - amount), [remainingBalance, amount]);
  const willPayOff = amount > 0 && newRemaining <= 0;
  const valid = amount > 0;
  const quickPercents = [0.25, 0.5, 1];

  // ---- Add money / top up --------------------------------------------------
  const [addRaw, setAddRaw] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const addAmount = Math.max(0, Number(addRaw) || 0);
  const canAdd = addAmount > 0 && !depositing;
  const handleAddMoney = async () => {
    if (!canAdd) return;
    setDepositing(true);
    setDepositError(null);
    try {
      const updated = await api.depositToAccount(applicantId, addAmount);
      setAccountBalance(updated.accountBalance);
      setBalanceError(null);
      setAddRaw('');
    } catch {
      setDepositError('Could not add money. Please try again.');
    } finally {
      setDepositing(false);
    }
  };

  const handlePay = async () => {
    if (!valid) return;
    const res = await onSubmit(amount);
    // Update the displayed account balance from the response so the money moves
    // live. On a full payoff the parent navigates away, so only reset the input
    // when the loan still has a balance (avoids touching an unmounting screen).
    if (res) {
      if (typeof res.accountBalance === 'number') setAccountBalance(res.accountBalance);
      if (res.remainingBalance > 0) {
        setRaw('');
        setCapped(false);
      }
    }
  };
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Make a payment</h2>
        <p className="mt-1 text-sm text-[#667085]">
          Payments draw from your account balance and reduce your loan directly. You can't pay more
          than you owe or more than your balance.
        </p>
      </div>

      {/* First-visit coaching for payments */}
      <FirstVisitTip tipKey="tip-payment" title="Paying from your balance">
        Payments come out of your account balance. If it's low, use{' '}
        <span className="font-semibold">Add money</span> to top up, then you can pay more, or pay the loan off in
        full.
      </FirstVisitTip>

      <Card className="p-6 sm:p-8">
        {/* Two distinct figures: what you owe vs. what you can pay with. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] px-4 py-3">
            <div className="text-xs text-[#667085]">Loan remaining</div>
            <Money value={remainingBalance} className="mt-0.5 block text-lg font-semibold text-[#101828]" />
          </div>
          <div className="rounded-xl border border-[#e6e9ef] bg-[#f8fafc] px-4 py-3">
            <div className="text-xs text-[#667085]">Account balance</div>
            {balanceKnown ? <Money value={accountBalance} className="mt-0.5 block text-lg font-semibold text-[#101828]" /> : <span className="mt-0.5 block text-lg font-semibold text-[#98a2b3]">{balanceError ? '—' : 'Loading…'}</span>}
          </div>
        </div>
        {balanceError && <p className="mt-2 text-xs font-medium text-[#d92d20]">{balanceError}</p>}

        {/* Add money / top up — funds future payments and raises the cap. */}
        <div className="mt-3 rounded-xl border border-dashed border-[#d0d5dd] p-4">
          <div className="text-sm font-medium text-[#344054]">Add money to your account</div>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#667085]">
                $
              </span>
              <input type="number" min={0} step={50} placeholder="0.00" value={addRaw} onChange={e => setAddRaw(e.target.value)} className={`${inputCls(false)} pl-7 tabular-nums`} />
            </div>
            <Button variant="secondary" onClick={handleAddMoney} disabled={!canAdd}>
              {depositing ? 'Adding…' : 'Add money'}
            </Button>
          </div>
          {depositError && <span className="mt-1.5 block text-xs font-medium text-[#d92d20]">{depositError}</span>}
        </div>

        <div className="mt-5">
          <Field label="Payment amount" htmlFor="payAmount" error={capped ? `Capped at your available balance of ${fmtUSD(available)}.` : null} hint={!capped ? shortOnFunds ? `You can pay up to your available balance of ${fmtUSD(available)}. Add money to pay more.` : 'Enter any amount up to your loan remaining.' : undefined}>

            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[#667085]">
                $
              </span>
              <input id="payAmount" type="number" min={0} max={available} step={50} placeholder="0.00" value={raw} onChange={e => setAmount(e.target.value)} className={`${inputCls(false)} pl-8 text-2xl font-semibold tabular-nums`} />

            </div>
          </Field>

          {/* Quick amounts — as a fraction of what you can actually pay now. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {quickPercents.map(p => <button key={p} type="button" onClick={() => setAmount(String(round2(available * p)))} className="rounded-lg border border-[#d0d5dd] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb]">

                {p === 1 ? shortOnFunds ? 'Max available' : 'Pay in full' : `${p * 100}%`}
              </button>)}
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-6 rounded-xl border border-[#e6e9ef] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">After this payment</div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-xs text-[#667085]">New loan remaining</div>
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
          Interest was fixed at approval and is already included in your balance. It never grows.
        </p>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <IconChevronLeft size={16} />
            Back to loan
          </Button>
          <Button onClick={handlePay} disabled={!valid || submitting || depositing}>
            <IconWallet size={16} />
            {submitting ? 'Processing…' : `Pay ${amount > 0 ? fmtUSD(amount) : ''}`}
          </Button>
        </div>
      </Card>
    </div>;
};
