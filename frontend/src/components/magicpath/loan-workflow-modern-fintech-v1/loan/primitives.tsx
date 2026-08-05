import React from 'react';
import { fmtUSD, statusStyle } from './model';
import { IconCheck, IconInfo } from './icons';

// ---------------------------------------------------------------------------
// Money — always tabular numerals so digits align vertically in tables/tiles.
// ---------------------------------------------------------------------------
export const Money: React.FC<{
  value: number;
  className?: string;
}> = ({
  value,
  className = ''
}) => <span className={`tabular-nums tracking-tight ${className}`}>{fmtUSD(value)}</span>;

// ---------------------------------------------------------------------------
// Card — the primary container: soft shadow + 1px border, generous padding.
// ---------------------------------------------------------------------------
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...rest
}) => <div className={`rounded-2xl border border-[#e6e9ef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.10)] ${className}`} {...rest}>
  
    {children}
  </div>;

// ---------------------------------------------------------------------------
// StatusBadge — single source of truth for status pills (color map in model).
// ---------------------------------------------------------------------------
export const StatusBadge: React.FC<{
  status: string;
  size?: 'sm' | 'md';
}> = ({
  status,
  size = 'md'
}) => {
  const s = statusStyle(status);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad}`} style={{
    backgroundColor: s.bg,
    color: s.text,
    boxShadow: `inset 0 0 0 1px ${s.ring}`
  }}>
      
      <span className="h-1.5 w-1.5 rounded-full" style={{
      backgroundColor: s.dot
    }} />
      <span className="uppercase tracking-wide">{status.replace('-', ' ')}</span>
    </span>;
};

// ---------------------------------------------------------------------------
// StatTile — small label, big number. The hero figure can be emphasized.
// ---------------------------------------------------------------------------
export const StatTile: React.FC<{
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
  emphasis?: boolean;
  accent?: string;
}> = ({
  label,
  children,
  sub,
  emphasis = false,
  accent
}) => <div className={`min-w-0 rounded-xl border p-4 sm:p-5 ${emphasis ? 'border-transparent text-white' : 'border-[#e6e9ef] bg-white'}`} style={emphasis ? {
  background: accent ?? 'linear-gradient(135deg,#2563eb,#1d4ed8)'
} : undefined}>

    <div className={`text-[11px] font-semibold uppercase tracking-wider ${emphasis ? 'text-white/70' : 'text-[#667085]'}`}>

      {label}
    </div>
    <div className={`mt-1.5 min-w-0 break-words font-semibold tabular-nums tracking-tight ${emphasis ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-2xl text-[#101828]'}`}>
    
      {children}
    </div>
    {sub && <div className={`mt-1 text-xs ${emphasis ? 'text-white/75' : 'text-[#667085]'}`}>{sub}</div>}
  </div>;

// ---------------------------------------------------------------------------
// Button — one brand color; primary / secondary / ghost / danger variants.
// ---------------------------------------------------------------------------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  block?: boolean;
}> = ({
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...rest
}) => {
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:bg-[#1e40af] shadow-[0_1px_2px_rgba(16,24,40,0.12)]',
    secondary: 'bg-white text-[#344054] border border-[#d0d5dd] hover:bg-[#f9fafb] active:bg-[#f2f4f7]',
    ghost: 'bg-transparent text-[#475467] hover:bg-[#f2f4f7]',
    danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c] active:bg-[#991b1b]',
    success: 'bg-[#16a34a] text-white hover:bg-[#15803d] active:bg-[#166534]'
  };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 ${block ? 'w-full' : ''} ${variants[variant]} ${className}`} {...rest}>
      
      {children}
    </button>;
};

// ---------------------------------------------------------------------------
// Segmented — the persistent role switcher (Customer ⇄ Staff).
// ---------------------------------------------------------------------------
export interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}
export const Segmented: React.FC<{
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}> = ({
  options,
  value,
  onChange,
  ariaLabel
}) => <div role="tablist" aria-label={ariaLabel} className="inline-flex items-center gap-1 rounded-xl border border-[#e6e9ef] bg-[#f2f4f7] p-1">
  
    {options.map(o => {
    const active = o.value === value;
    return <button key={o.value} role="tab" aria-selected={active} onClick={() => onChange(o.value)} className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${active ? 'bg-white text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.10)]' : 'text-[#667085] hover:text-[#344054]'}`}>
        
          {o.icon}
          <span>{o.label}</span>
          {typeof o.badge === 'number' && o.badge > 0 && <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold leading-none text-white">
              {o.badge}
            </span>}
        </button>;
  })}
  </div>;

// ---------------------------------------------------------------------------
// EndpointNote — subtle "maps to <METHOD /path>" annotation.
// ---------------------------------------------------------------------------
export const EndpointNote: React.FC<{
  endpoint: string;
  className?: string;
}> = ({
  endpoint,
  className = ''
}) => <span className={`inline-flex items-center gap-1.5 rounded-md border border-[#e6e9ef] bg-[#f8fafc] px-2 py-1 font-mono text-[10px] text-[#667085] ${className}`}>
  
    <IconInfo size={11} className="text-[#98a2b3]" />
    maps to {endpoint}
  </span>;

// ---------------------------------------------------------------------------
// Stepper — linear labeled progress used for status tracking.
// ---------------------------------------------------------------------------
export interface Step {
  key: string;
  label: string;
}
export const Stepper: React.FC<{
  steps: Step[];
  current: number;
  compact?: boolean;
}> = ({
  steps,
  current,
  compact = false
}) => <div className="flex w-full items-center">
    {steps.map((step, i) => {
    const done = i < current;
    const active = i === current;
    return <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`flex items-center justify-center rounded-full border transition-all duration-300 ${compact ? 'h-6 w-6 text-[11px]' : 'h-8 w-8 text-xs'} ${done ? 'border-[#2563eb] bg-[#2563eb] text-white' : active ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]' : 'border-[#e6e9ef] bg-white text-[#98a2b3]'}`}>
            
              {done ? <IconCheck size={compact ? 13 : 15} /> : <span className="font-semibold">{i + 1}</span>}
            </div>
            {!compact && <span className={`whitespace-nowrap text-[11px] font-medium ${active ? 'text-[#1d4ed8]' : done ? 'text-[#475467]' : 'text-[#98a2b3]'}`}>
            
                {step.label}
              </span>}
          </div>
          {i < steps.length - 1 && <div className="mx-1.5 h-[2px] flex-1 self-start rounded-full bg-[#e6e9ef]" style={{
        marginTop: compact ? 11 : 15
      }}>
          
              <div className="h-full rounded-full bg-[#2563eb] transition-all duration-500" style={{
          width: i < current ? '100%' : '0%'
        }} />
          
            </div>}
        </React.Fragment>;
  })}
  </div>;

// ---------------------------------------------------------------------------
// ProgressRing — circular payoff indicator.
// ---------------------------------------------------------------------------
export const ProgressRing: React.FC<{
  percent: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}> = ({
  percent,
  size = 168,
  stroke = 14,
  color = '#2563eb',
  track = '#eaecf0',
  children
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - clamped / 100 * c;
  return <div className="relative inline-flex items-center justify-center" style={{
    width: size,
    height: size
  }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{
        transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)'
      }} />
        
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>;
};

// ---------------------------------------------------------------------------
// Field — labeled input with inline validation error slot.
// ---------------------------------------------------------------------------
export const Field: React.FC<{
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}> = ({
  label,
  htmlFor,
  error,
  hint,
  children
}) => <div className="flex flex-col gap-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-[#344054]">
      {label}
    </label>
    {children}
    {error ? <span className="text-xs font-medium text-[#d92d20]">{error}</span> : hint ? <span className="text-xs text-[#667085]">{hint}</span> : null}
  </div>;
export const inputCls = (hasError?: boolean) => `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#101828] placeholder:text-[#98a2b3] transition-shadow duration-150 focus:outline-none focus:ring-4 ${hasError ? 'border-[#fda29b] focus:border-[#f04438] focus:ring-[#fee4e2]' : 'border-[#d0d5dd] focus:border-[#2563eb] focus:ring-[#eff6ff]'}`;