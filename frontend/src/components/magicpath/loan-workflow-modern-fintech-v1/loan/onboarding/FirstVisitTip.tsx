import React, { useEffect, useState } from 'react';
import { IconInfo, IconX } from '../icons';
import { useOnboarding } from './useOnboarding';

// ---------------------------------------------------------------------------
// FirstVisitTip — a small, dismissible coach-mark shown the FIRST time a user
// lands on a page. Keyed by `tipKey`; once dismissed the key is pushed into
// tipsSeen (localStorage) so it never shows again — until onboarding is reset.
//
// It sits inline in the page flow (not fixed/overlay), so it never blocks
// interaction. CSS transitions only; no animation dependency.
// ---------------------------------------------------------------------------

type Tone = 'info' | 'neutral';

const TONE: Record<Tone, { wrap: string; iconWrap: string; title: string; body: string; btn: string }> = {
  info: {
    wrap: 'border-[#bfdbfe] bg-[#eff6ff]',
    iconWrap: 'bg-white text-[#2563eb]',
    title: 'text-[#1e3a8a]',
    body: 'text-[#334e9c]',
    btn: 'text-[#1d4ed8] hover:bg-[#dbeafe]'
  },
  neutral: {
    wrap: 'border-[#e6e9ef] bg-[#f8fafc]',
    iconWrap: 'bg-white text-[#475467]',
    title: 'text-[#101828]',
    body: 'text-[#475467]',
    btn: 'text-[#475467] hover:bg-[#f2f4f7]'
  }
};

export interface FirstVisitTipProps {
  tipKey: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}

export const FirstVisitTip: React.FC<FirstVisitTipProps> = ({
  tipKey,
  title,
  description,
  children,
  tone = 'info',
  icon,
  className = ''
}) => {
  const { mounted, isTipSeen, markTipSeen } = useOnboarding();
  const seen = isTipSeen(tipKey);

  const [entered, setEntered] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (seen) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [mounted, seen]);

  const dismiss = () => {
    if (dismissing) return;
    setDismissing(true);
    setEntered(false);
    window.setTimeout(() => {
      markTipSeen(tipKey);
      setDismissing(false);
    }, 180);
  };

  // Nothing before hydration; nothing once seen (unless mid-exit animation).
  if (!mounted || (seen && !dismissing)) return null;

  const t = TONE[tone];
  const content = description ?? children;

  return (
    <div
      role="note"
      className={`overflow-hidden rounded-xl border p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 ease-out sm:p-4 ${t.wrap} ${entered ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'} ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.iconWrap}`}>
          {icon ?? <IconInfo size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className={`text-sm font-semibold ${t.title}`}>{title}</div>
            <button
              onClick={dismiss}
              aria-label="Dismiss tip"
              className={`-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${t.btn}`}
            >
              <IconX size={15} />
            </button>
          </div>
          {content && <div className={`mt-0.5 text-xs leading-relaxed ${t.body}`}>{content}</div>}
          <div className="mt-2.5">
            <button
              onClick={dismiss}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${t.btn}`}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
