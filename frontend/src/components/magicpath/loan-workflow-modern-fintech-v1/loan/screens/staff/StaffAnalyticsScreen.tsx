import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import * as api from '@/lib/api';
import { LoanApplication, Loan, LoanPayment, fmtUSD } from '../../model';
import { Card, StatTile } from '../../primitives';
import { IconInbox, IconRepay } from '../../icons';

// ---------------------------------------------------------------------------
// Staff analytics dashboard. Fetches the whole book (applications + loans +
// payments) on mount, then computes every KPI + chart series CLIENT-SIDE. No
// aggregation endpoint exists on the backend — this screen is the aggregation.
// ---------------------------------------------------------------------------

// Consistent status colors (shared with the status pills, but tuned so the
// donut slices stay visually distinct): amber=PENDING, green=APPROVED,
// red=REJECTED, teal=PAID-OFF.
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#16a34a',
  REJECTED: '#dc2626',
  'PAID-OFF': '#0d9488',
};

// Category palette for the "loans by purpose" bars — the app's cool blue as the
// primary plus a small set of distinct, accessible hues.
const CATEGORY_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#db2777', '#0891b2'];

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fmtCompactUSD = (n: number): string => '$' + compact.format(Number.isFinite(n) ? n : 0);

const fmtDay = (day: string): string => {
  const d = new Date(day + 'T00:00:00');
  return isNaN(d.getTime()) ? day : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtDayLong = (day: string): string => {
  const d = new Date(day + 'T00:00:00');
  return isNaN(d.getTime())
    ? day
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-[#e6e9ef] bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(16,24,40,0.25)]">
    {children}
  </div>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StatusTip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <Tip>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: p.payload.color }} />
        <span className="font-semibold text-[#101828]">{p.payload.label}</span>
      </div>
      <div className="mt-0.5 text-[#667085]">
        <span className="font-semibold tabular-nums text-[#101828]">{p.value}</span>{' '}
        {p.value === 1 ? 'application' : 'applications'}
      </div>
    </Tip>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FundedTip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <Tip>
      <div className="font-semibold text-[#101828]">{fmtDayLong(d.day)}</div>
      <div className="mt-1 flex items-center justify-between gap-6 text-[#667085]">
        <span>Cumulative</span>
        <span className="font-semibold tabular-nums text-[#101828]">{fmtUSD(d.cumulative)}</span>
      </div>
      <div className="flex items-center justify-between gap-6 text-[#667085]">
        <span>This day</span>
        <span className="tabular-nums text-[#101828]">
          {fmtUSD(d.daily)}, {d.count} loan{d.count === 1 ? '' : 's'}
        </span>
      </div>
    </Tip>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PurposeTip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <Tip>
      <div className="font-semibold text-[#101828]">{d.purpose}</div>
      <div className="mt-0.5 text-[#667085]">
        <span className="font-semibold tabular-nums text-[#101828]">{d.count}</span>{' '}
        application{d.count === 1 ? '' : 's'}
      </div>
    </Tip>
  );
};

const ChartCard: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <Card className="p-5">
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-[#101828]">{title}</h3>
      <p className="mt-0.5 text-xs text-[#667085]">{subtitle}</p>
    </div>
    {children}
  </Card>
);

const ChartEmpty: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2f4f7] text-[#98a2b3]">
      <IconInbox size={20} />
    </span>
    <p className="text-sm text-[#667085]">{label}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export const StaffAnalyticsScreen: React.FC = () => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apps, lns, pays] = await Promise.all([
        api.listApplications(),
        api.listLoans(),
        api.listPayments(),
      ]);
      setApplications(apps);
      setLoans(lns);
      setPayments(pays);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- KPI aggregates ----------------------------------------------------
  const kpi = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(a => a.status === 'PENDING').length;
    const approved = applications.filter(a => a.status === 'APPROVED').length;
    const paidOff = applications.filter(a => a.status === 'PAID-OFF').length;
    const rejected = applications.filter(a => a.status === 'REJECTED').length;
    const decided = total - pending;
    // Approval rate over DECIDED apps only; "—" when nothing has been decided.
    const approvalRate = decided > 0 ? ((approved + paidOff) / decided) * 100 : null;
    const totalFunded = loans.reduce((s, l) => s + l.loanAmount, 0);
    const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
    const totalRepaid = payments.reduce((s, p) => s + p.amountPaid, 0);
    // Outstanding = remaining balance still owed on APPROVED (unpaid) applications.
    const outstanding = applications
      .filter(a => a.status === 'APPROVED' && (a.remainingBalance ?? 0) > 0)
      .reduce((s, a) => s + (a.remainingBalance ?? 0), 0);
    return {
      total,
      pending,
      approved,
      paidOff,
      rejected,
      approvalRate,
      totalFunded,
      activeLoans,
      totalRepaid,
      outstanding,
    };
  }, [applications, loans, payments]);

  // ---- Chart series ------------------------------------------------------
  const statusData = useMemo(
    () =>
      [
        { key: 'PENDING', label: 'Pending', value: kpi.pending },
        { key: 'APPROVED', label: 'Approved', value: kpi.approved },
        { key: 'REJECTED', label: 'Rejected', value: kpi.rejected },
        { key: 'PAID-OFF', label: 'Paid off', value: kpi.paidOff },
      ]
        .filter(d => d.value > 0)
        .map(d => ({ ...d, color: STATUS_COLOR[d.key] })),
    [kpi],
  );

  const fundedOverTime = useMemo(() => {
    const byDay = new Map<string, { amount: number; count: number }>();
    for (const l of loans) {
      const day = (l.issuedAt || '').slice(0, 10);
      if (!day) continue;
      const cur = byDay.get(day) ?? { amount: 0, count: 0 };
      cur.amount += l.loanAmount;
      cur.count += 1;
      byDay.set(day, cur);
    }
    let cumulative = 0;
    return Array.from(byDay.keys())
      .sort()
      .map(day => {
        const { amount, count } = byDay.get(day)!;
        cumulative += amount;
        return { day, daily: amount, count, cumulative };
      });
  }, [loans]);

  const purposeData = useMemo(() => {
    const byPurpose = new Map<string, number>();
    for (const a of applications) {
      const raw = (a.loanPurpose ?? '').trim();
      const purpose = raw.length ? raw : 'Unspecified';
      byPurpose.set(purpose, (byPurpose.get(purpose) ?? 0) + 1);
    }
    return Array.from(byPurpose.entries())
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count);
  }, [applications]);

  // ---- States ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div className="flex items-center justify-center rounded-2xl border border-[#e6e9ef] bg-white py-20 text-sm text-[#667085]">
          Loading portfolio analytics…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] py-16 text-center">
          <p className="text-sm text-[#b91c1c]">{error}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-3 py-1.5 text-xs font-semibold text-[#475467] transition-colors hover:bg-[#f9fafb]"
          >
            <IconRepay size={13} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rateLabel = kpi.approvalRate == null ? '—' : `${kpi.approvalRate.toFixed(1)}%`;
  const totalPct = (n: number) => (kpi.total > 0 ? Math.round((n / kpi.total) * 100) : 0);

  return (
    <div className="flex flex-col gap-6">
      <Header />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total applications" sub="All time">
          {kpi.total}
        </StatTile>
        <StatTile
          label="Pending review"
          sub="Awaiting a decision"
          emphasis
          accent="linear-gradient(135deg,#d97706,#b45309)"
        >
          {kpi.pending}
        </StatTile>
        <StatTile label="Approval rate" sub="Of decided applications">
          {rateLabel}
        </StatTile>
        <StatTile label="Total funded" sub="Sum of loan amounts" emphasis>
          {fmtUSD(kpi.totalFunded)}
        </StatTile>
        <StatTile label="Active loans" sub="Currently outstanding">
          {kpi.activeLoans}
        </StatTile>
        <StatTile label="Total repaid" sub="Across all payments">
          {fmtUSD(kpi.totalRepaid)}
        </StatTile>
        <StatTile label="Outstanding balance" sub="Owed on approved loans">
          {fmtUSD(kpi.outstanding)}
        </StatTile>
        <StatTile label="Paid off loans" sub="Fully repaid applications">
          {kpi.paidOff}
        </StatTile>
      </div>

      {/* Row 1: status donut + funded-over-time */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Application status" subtitle="Breakdown of every application by decision">
          {statusData.length === 0 ? (
            <ChartEmpty label="No applications yet." />
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="none"
                      // recharts v3's Pie entrance animation (default
                      // animationBegin: 400ms) holds every sector at a ZERO
                      // angle for the first frames — the ring is invisible /
                      // renders no sector <path>s until it fires. Disable it so
                      // the donut draws at full angle on first paint.
                      isAnimationActive={false}
                    >
                      {statusData.map(d => (
                        <Cell key={d.key} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<StatusTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold tabular-nums text-[#101828]">{kpi.total}</span>
                  <span className="text-[11px] text-[#667085]">applications</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {statusData.map(d => (
                  <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-[#344054]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.label}
                    </span>
                    <span className="tabular-nums text-[#667085]">
                      <span className="font-semibold text-[#101828]">{d.value}</span>, {totalPct(d.value)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Loans funded over time" subtitle="Cumulative funded amount by issue date">
          {fundedOverTime.length === 0 ? (
            <ChartEmpty label="No loans funded yet." />
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fundedOverTime} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fundedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={fmtDay}
                    tick={{ fontSize: 11, fill: '#98a2b3' }}
                    axisLine={{ stroke: '#e6e9ef' }}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={fmtCompactUSD}
                    tick={{ fontSize: 11, fill: '#98a2b3' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<FundedTip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#fundedFill)"
                    dot={{ r: 2.5, fill: '#2563eb', strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Row 2: loans by purpose */}
      <ChartCard title="Applications by purpose" subtitle="What borrowers are asking loans for">
        {purposeData.length === 0 ? (
          <ChartEmpty label="No applications yet." />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purposeData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                <XAxis
                  dataKey="purpose"
                  tick={{ fontSize: 11, fill: '#667085' }}
                  axisLine={{ stroke: '#e6e9ef' }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#98a2b3' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<PurposeTip />} cursor={{ fill: '#f2f4f7' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {purposeData.map((d, i) => (
                    <Cell key={d.purpose} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

const Header: React.FC = () => (
  <div>
    <h2 className="text-xl font-semibold tracking-tight text-[#101828]">Portfolio analytics</h2>
    <p className="mt-1 text-sm text-[#667085]">Northline book overview, computed live from the loan ledger.</p>
  </div>
);
