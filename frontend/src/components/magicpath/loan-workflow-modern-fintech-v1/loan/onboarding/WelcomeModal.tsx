import React, { useEffect, useState } from 'react';
import { Button } from '../primitives';
import { IconLogo, IconApply, IconOffer, IconRepay, IconUser, IconBriefcase, IconX, IconArrowRight } from '../icons';
import { useOnboarding } from './useOnboarding';

// ---------------------------------------------------------------------------
// WelcomeModal — shown once, on first load, when the welcome hasn't been seen.
// CSS-transition entrance/exit only (framer-motion is not a dependency).
// Dismissing via the button, the X, the backdrop or Escape all mark it seen so
// it never nags again (until the header "Reset" clears onboarding state).
// ---------------------------------------------------------------------------

const HIGHLIGHTS: { icon: React.FC<{ size?: number }>; title: string; body: string }[] = [{
  icon: IconApply,
  title: 'Apply in minutes',
  body: 'Share a few details and the amount you need.'
}, {
  icon: IconOffer,
  title: 'See the real number first',
  body: 'Pick a term and see your exact monthly payment before you apply.'
}, {
  icon: IconRepay,
  title: 'Track & pay off early',
  body: 'Follow your balance, make payments, and save on interest by paying ahead.'
}];

export const WelcomeModal: React.FC = () => {
  const { mounted, welcomeSeen, markWelcomeSeen } = useOnboarding();
  const shouldRender = mounted && !welcomeSeen;

  // `open` drives the enter/exit CSS transition; `closing` keeps the node
  // mounted for the exit animation before we flip welcomeSeen and unmount.
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!shouldRender) return;
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [shouldRender]);

  // Lock body scroll while the modal is up.
  useEffect(() => {
    if (!shouldRender) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shouldRender]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    window.setTimeout(() => {
      markWelcomeSeen();
      setClosing(false);
    }, 200);
  };

  useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="northline-welcome-title"
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
    >
      {/* Backdrop */}
      <div
        onClick={close}
        className={`absolute inset-0 bg-[#0b1220]/50 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#e6e9ef] bg-white shadow-[0_24px_64px_-16px_rgba(16,24,40,0.45)] transition-all duration-200 ease-out ${open ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-3 opacity-0 sm:translate-y-0 sm:scale-95'}`}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#98a2b3] transition-colors hover:bg-[#f2f4f7] hover:text-[#475467] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
        >
          <IconX size={18} />
        </button>

        {/* Brand header */}
        <div className="flex items-center gap-2.5 border-b border-[#e6e9ef] bg-[#f8fafc] px-5 py-4 sm:px-6">
          <span className="text-[#2563eb]">
            <IconLogo size={30} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-[#101828]">Northline Capital</div>
            <div className="text-[11px] text-[#98a2b3]">Welcome to the quick tour</div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <h2 id="northline-welcome-title" className="text-xl font-semibold tracking-tight text-[#101828] sm:text-2xl">
            Borrow with numbers you can trust.
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#475467]">
            Northline lets you apply for a fixed rate loan, see your exact monthly payment before you apply,
            then track repayment and pay off early to save on interest.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {HIGHLIGHTS.map(h => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#101828]">{h.title}</div>
                    <div className="text-xs leading-relaxed text-[#667085]">{h.body}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Role-toggle note */}
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#e6e9ef] bg-[#f8fafc] p-3 text-xs leading-relaxed text-[#475467]">
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[#667085]">
              <IconUser size={14} />
              <IconBriefcase size={14} />
            </span>
            <span>
              Switch between the <span className="font-semibold text-[#101828]">Customer</span> and{' '}
              <span className="font-semibold text-[#101828]">Northline Staff</span> views anytime with the toggle
              at the top right.
            </span>
          </div>

          <div className="mt-6">
            <Button block onClick={close} className="py-3 text-base">
              Get started
              <IconArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
