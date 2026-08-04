import React, { useEffect, useMemo, useState } from 'react';
import { quote, fmtUSD, fmtUSD0, fmtPct, TIERS, TERM_OPTIONS, DEFAULT_TERM_MONTHS } from '../model';
import { Card, Button, Money } from '../primitives';
import { IconApply, IconReview, IconOffer, IconRepay, IconArrowRight, IconShield, IconInfo } from '../icons';
const STEPS = [{
  icon: IconApply,
  title: 'Apply',
  body: 'Share a few details and the amount you need.'
}, {
  icon: IconReview,
  title: 'Get reviewed',
  body: 'A loan officer verifies and underwrites your request.'
}, {
  icon: IconOffer,
  title: 'Offer & funds',
  body: 'Accept your offer — your rate and monthly payment are locked for your term.'
}, {
  icon: IconRepay,
  title: 'Repay',
  body: 'Fixed monthly payments over your term. Pay off early anytime to save on interest.'
}];
const MIN = 500;
const MAX = 100000;
const STEP = 500;
export const LandingScreen: React.FC<{
  calcAmount: number;
  setCalcAmount: (n: number) => void;
  onApply: () => void;
}> = ({
  calcAmount,
  setCalcAmount,
  onApply
}) => {
  // Free-text state for the amount box: the user may type ANY value (including
  // temporarily below MIN or empty) without it being overwritten mid-typing.
  // The [MIN, MAX] clamp is applied only on blur / slider / Apply — never per key.
  const [amountText, setAmountText] = useState(String(calcAmount));
  useEffect(() => {
    setAmountText(String(calcAmount));
  }, [calcAmount]);

  // Numeric value derived from the typed text, used ONLY for the live preview /
  // slider position. Empty or invalid input falls back to a neutral 0 state.
  const parsed = amountText.trim() === '' ? NaN : Number(amountText);
  const previewAmount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const [termMonths, setTermMonths] = useState<number>(DEFAULT_TERM_MONTHS);
  const q = useMemo(() => quote(previewAmount, termMonths), [previewAmount, termMonths]);
  const pct = Math.max(0, Math.min(100, (previewAmount - MIN) / (MAX - MIN) * 100));
  const clampToRange = (n: number) => Math.max(MIN, Math.min(MAX, Math.round(n)));
  const commitAmount = () => {
    const n = Number(amountText);
    const clamped = clampToRange(amountText.trim() !== '' && Number.isFinite(n) ? n : MIN);
    setAmountText(String(clamped));
    setCalcAmount(clamped);
  };
  const handleSlider = (v: number) => {
    setAmountText(String(v));
    setCalcAmount(v);
  };
  const handleApply = () => {
    commitAmount();
    onApply();
  };
  return <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="flex flex-col items-start gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e9ef] bg-white px-3 py-1 text-xs font-medium text-[#475467]">
          <IconShield size={13} className="text-[#2563eb]" />
          Transparent lending — see your monthly payment before you apply
        </span>
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-[#101828] sm:text-4xl">
          Borrow with numbers you can trust.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[#475467] sm:text-base">
          Fixed-rate loans from $500 to $100,000. Pick a term, see your exact monthly payment before you apply,
          and pay off early anytime to save on interest.
        </p>
      </div>

      {/* How loans work — 4 step diagram */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#667085]">How loans work</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
          const Icon = s.icon;
          return <div key={s.title} className="relative">
                <Card className="h-full p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                      <Icon size={18} />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#98a2b3]">
                      Step {i + 1}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[#101828]">{s.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-[#667085]">{s.body}</div>
                </Card>
                {i < STEPS.length - 1 && <span className="absolute -right-[10px] top-1/2 z-10 hidden -translate-y-1/2 text-[#cbd5e1] lg:block">
                    <IconArrowRight size={16} />
                  </span>}
              </div>;
        })}
        </div>
      </div>

      {/* Interactive calculator */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Controls */}
          <div className="border-b border-[#e6e9ef] p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#101828]">Estimate your loan</h3>
              <span className="text-xs text-[#667085]">Drag or type an amount</span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                  Loan amount
                </div>
                <div className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight text-[#101828]">
                  {fmtUSD0(previewAmount)}
                </div>
              </div>
              <div className="flex items-center rounded-xl border border-[#d0d5dd] px-3 py-2 focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#eff6ff]">
                <span className="mr-1 text-sm text-[#667085]">$</span>
                <input aria-label="Loan amount" type="number" min={MIN} max={MAX} step={STEP} value={amountText} onChange={e => setAmountText(e.target.value)} onBlur={commitAmount} className="w-24 bg-transparent text-right text-sm font-semibold tabular-nums text-[#101828] outline-none" />
                
              </div>
            </div>

            {/* Slider */}
            <div className="mt-5">
              <input aria-label="Loan amount slider" type="range" min={MIN} max={MAX} step={STEP} value={clampToRange(previewAmount || MIN)} onChange={e => handleSlider(Number(e.target.value))} className="mp-range w-full" style={{
              background: `linear-gradient(90deg,#2563eb ${pct}%,#e6e9ef ${pct}%)`
            }} />
              
              <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[#98a2b3]">
                <span>{fmtUSD0(MIN)}</span>
                <span>{fmtUSD0(MAX)}</span>
              </div>
            </div>

            {/* Repayment term — drives the monthly payment and totals below */}
            <div className="mt-5">
              <label htmlFor="calcTerm" className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                Repayment term
              </label>
              <select id="calcTerm" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#101828] transition-shadow duration-150 focus:border-[#2563eb] focus:outline-none focus:ring-4 focus:ring-[#eff6ff]">
                {TERM_OPTIONS.map(t => <option key={t} value={t}>{t} months</option>)}
              </select>
            </div>

            {/* Tier legend */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {TIERS.map(t => {
              const activeTier = t.rate === q.rate;
              return <div key={t.label} className={`rounded-lg border p-2.5 text-center transition-colors ${activeTier ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-[#e6e9ef] bg-white'}`}>
                    
                    <div className={`text-xs font-semibold ${activeTier ? 'text-[#1d4ed8]' : 'text-[#344054]'}`}>
                      {fmtPct(t.rate)}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-tight text-[#667085]">{t.range}</div>
                  </div>;
            })}
            </div>
          </div>

          {/* Output — the monthly payment dominates */}
          <div className="flex flex-col justify-between gap-5 bg-[#f8fafc] p-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#475467]">Interest tier</span>
                <span className="font-semibold text-[#101828]">
                  {q.tier.label} · {fmtPct(q.rate)}
                </span>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">
                  Estimated monthly payment
                </div>
                <div className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-[#101828]">
                  {fmtUSD(q.monthly)}
                  <span className="ml-1.5 text-sm font-medium text-[#667085]">/ mo for {q.termMonths} months</span>
                </div>
              </div>
              <div className="my-1 h-px w-full bg-[#e6e9ef]" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#475467]">Principal</span>
                <Money value={q.principal} className="font-semibold text-[#101828]" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#475467]">Interest ({fmtPct(q.rate)})</span>
                <Money value={q.interest} className="font-semibold text-[#101828]" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#475467]">Total to repay</span>
                <Money value={q.total} className="font-semibold text-[#101828]" />
              </div>
              <div className="text-xs text-[#667085]">
                {fmtUSD(q.monthly)} × {q.termMonths} = {fmtUSD(q.total)} · principal {fmtUSD(q.principal)} + interest {fmtUSD(q.interest)}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button block onClick={handleApply} className="py-3 text-base">
                Apply now
                <IconArrowRight size={18} />
              </Button>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#667085]">
                <IconInfo size={13} className="mt-0.5 shrink-0 text-[#98a2b3]" />
                This is an estimate. Your officer approves the final amount; your rate is locked and your payment
                is fixed for the term. Pay early to save on interest.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>;
};