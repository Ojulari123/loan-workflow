import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Applicant, LoanApplication, Loan, LoanPayment } from './loan/model';
import * as api from '@/lib/api';
import { Segmented } from './loan/primitives';
import { IconLogo, IconRepay, IconUser, IconBriefcase, IconHome, IconInbox, IconLayers, IconChart } from './loan/icons';
// Customer screens
import { LandingScreen } from './loan/screens/LandingScreen';
import { ApplyScreen, ApplyForm } from './loan/screens/ApplyScreen';
import { SubmittedScreen } from './loan/screens/SubmittedScreen';
import { MyLoansScreen } from './loan/screens/MyLoansScreen';
import { DashboardScreen } from './loan/screens/DashboardScreen';
import { PaymentScreen } from './loan/screens/PaymentScreen';
import { PayoffScreen } from './loan/screens/PayoffScreen';
// Staff screens
import { StaffInboxScreen } from './loan/screens/staff/StaffInboxScreen';
import { StaffDetailScreen } from './loan/screens/staff/StaffDetailScreen';
import { StaffLoansScreen } from './loan/screens/staff/StaffLoansScreen';
import { StaffAnalyticsScreen } from './loan/screens/staff/StaffAnalyticsScreen';
// Customer AI copilot (floating launcher + chat panel)
import { CopilotChat } from './loan/CopilotChat';
// First-run onboarding (welcome modal + per-page tips, localStorage-backed)
import { WelcomeModal } from './loan/onboarding/WelcomeModal';
import { useOnboarding } from './loan/onboarding/useOnboarding';
type Role = 'customer' | 'staff';
type CustView = 'landing' | 'apply' | 'submitted' | 'myloans' | 'dashboard' | 'payment' | 'payoff';
type StaffTab = 'inbox' | 'loans' | 'dashboard';

// ---------------------------------------------------------------------------
// Merge fetched rows into a list by id, replacing existing entries and
// appending new ones. Both roles read from the same four arrays, so we upsert
// (rather than replace) to avoid one view clobbering the other's rows.
// ---------------------------------------------------------------------------
function upsert<T>(list: T[], items: T[], key: (x: T) => string): T[] {
  if (items.length === 0) return list;
  const map = new Map(list.map(x => [key(x), x]));
  for (const it of items) map.set(key(it), it);
  return Array.from(map.values());
}

export const LoanWorkflowModernFintechV1: React.FC = () => {
  const [role, setRole] = useState<Role>('customer');

  // First-run onboarding: the Reset button also clears this so a fresh demo
  // re-triggers the welcome modal + every page's first-visit tip.
  const { resetOnboarding } = useOnboarding();

  // ---- Shared store — now populated from the live backend, not a seed ------
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [customerApplicantId, setCustomerApplicantId] = useState<string | null>(null);

  // ---- Async glue: in-flight mutation + background sync + error ------------
  const [busy, setBusy] = useState(false);      // a mutation is in flight (disables buttons)
  const [syncing, setSyncing] = useState(false); // a background list fetch is in flight
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false); // guards against double-submit before state flushes

  // ---- Customer view state ------------------------------------------------
  const [custView, setCustView] = useState<CustView>('landing');
  const [custAppId, setCustAppId] = useState<string | null>(null);
  const [calcAmount, setCalcAmount] = useState<number>(15000);

  // ---- Staff view state ---------------------------------------------------
  const [staffTab, setStaffTab] = useState<StaffTab>('inbox');
  const [staffDetailId, setStaffDetailId] = useState<string | null>(null);

  // ---- Derived ------------------------------------------------------------
  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const customerApps = applications.filter(a => a.applicantId === customerApplicantId);
  const findApp = (id: string | null) => applications.find(a => a.applicationId === id);
  const findLoanByApp = (id: string | null) => loans.find(l => l.loanApplicationId === id);
  const findApplicant = (id: string | undefined) => applicants.find(a => a.id === id);

  const msgOf = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';

  // ---- Data loaders -------------------------------------------------------
  const refreshStaff = useCallback(async () => {
    setSyncing(true);
    try {
      const [apps, lns] = await Promise.all([api.listApplications(), api.listLoans()]);
      setApplications(prev => upsert(prev, apps, a => a.applicationId));
      setLoans(prev => upsert(prev, lns, l => l.id));
      setError(null);
    } catch (e) {
      setError(msgOf(e));
    } finally {
      setSyncing(false);
    }
  }, []);

  const refreshCustomer = useCallback(async (applicantId: string) => {
    setSyncing(true);
    try {
      const [apps, lns, pays] = await Promise.all([
        api.getApplicationsByApplicant(applicantId),
        api.getLoansByApplicant(applicantId),
        api.getPaymentsByApplicant(applicantId),
      ]);
      setApplications(prev => upsert(prev, apps, a => a.applicationId));
      setLoans(prev => upsert(prev, lns, l => l.id));
      setPayments(prev => upsert(prev, pays, p => p.id));
      setError(null);
    } catch (e) {
      setError(msgOf(e));
    } finally {
      setSyncing(false);
    }
  }, []);

  // Initial load: makes the staff inbox + the pending badge reflect real data
  // from first paint, in either role.
  useEffect(() => { refreshStaff(); }, [refreshStaff]);

  // Re-sync the staff lists whenever the staff console is (re)opened.
  useEffect(() => { if (role === 'staff') refreshStaff(); }, [role, staffTab, refreshStaff]);

  // Re-sync this customer's applications/loans/payments when viewing them.
  useEffect(() => {
    if (role === 'customer' && customerApplicantId &&
        (custView === 'myloans' || custView === 'dashboard' || custView === 'payoff')) {
      refreshCustomer(customerApplicantId);
    }
  }, [role, custView, customerApplicantId, refreshCustomer]);

  // ---- Customer handlers --------------------------------------------------
  const handleCustomerSubmit = async (form: ApplyForm) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const applicant = await api.createApplicant({
        name: form.name,
        email: form.email,
        accountBalance: form.accountBalance,
        annualIncome: form.annualIncome,
        monthlyDebt: form.monthlyDebt,
        employmentStatus: form.employmentStatus,
      });
      const application = await api.applyForLoan(applicant.id, {
        amountRequested: form.amountRequested,
        loanPurpose: form.loanPurpose,
        termMonths: form.termMonths,
      });
      setApplicants(prev => upsert(prev, [applicant], a => a.id));
      setApplications(prev => upsert(prev, [application], a => a.applicationId));
      setCustomerApplicantId(applicant.id);
      setCustAppId(application.applicationId);
      setCustView('submitted');
    } catch (e) {
      setError(msgOf(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const handleManage = (applicationId: string) => {
    const app = findApp(applicationId);
    setCustAppId(applicationId);
    setCustView(app?.status === 'PAID-OFF' ? 'payoff' : 'dashboard');
  };
  const handlePayment = async (amount: number): Promise<LoanPayment | void> => {
    if (busyRef.current) return;
    const app = findApp(custAppId);
    const loan = findLoanByApp(custAppId);
    if (!app || !loan) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      // The payment response carries the new loan remaining AND the new applicant
      // account balance — returned to the PaymentScreen so it can show the money
      // move live without a full reload.
      const payment = await api.makePayment(loan.id, { amount });
      // Authoritative post-payment state comes from the backend: it recomputes
      // the remaining balance and flips status to PAID-OFF at zero.
      const [freshApp, freshLoans, freshPays] = await Promise.all([
        api.getApplication(app.applicationId),
        api.getLoansByApplicant(app.applicantId),
        api.getPaymentsByApplicant(app.applicantId),
      ]);
      setApplications(prev => upsert(prev, [freshApp], a => a.applicationId));
      setLoans(prev => upsert(prev, freshLoans, l => l.id));
      setPayments(prev => upsert(prev, freshPays, p => p.id));
      const paidOff = freshApp.status === 'PAID-OFF' || (freshApp.remainingBalance ?? 0) <= 0;
      // Payoff → existing paid-off flow. Partial payment → STAY on the payment
      // screen; its remainingBalance prop re-renders from the refreshed app and
      // the account balance updates from the returned payment.
      if (paidOff) setCustView('payoff');
      return payment;
    } catch (e) {
      setError(msgOf(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // ---- Staff handlers (approval lives here, off the customer flow) --------
  // Interest / approvedAmount are computed by the BACKEND; we send only the
  // approved base and re-read the authoritative row via refreshStaff().
  const handleApprove = async (applicationId: string, base: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await api.decideApplication(applicationId, 'APPROVED', base);
      await refreshStaff();
      setStaffDetailId(null);
    } catch (e) {
      setError(msgOf(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const handleReject = async (applicationId: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await api.decideApplication(applicationId, 'REJECTED');
      await refreshStaff();
      setStaffDetailId(null);
    } catch (e) {
      setError(msgOf(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const restart = async () => {
    // Reset now ALSO wipes the shared backend demo data so everyone starts
    // fresh — hence the confirm before we destroy other people's rows too.
    if (!window.confirm('Reset the demo? This clears all applications, loans, and payments for everyone and starts fresh.')) {
      return;
    }
    try {
      await api.resetDemo();
    } catch (e) {
      // A failed wipe shouldn't strand the user; fall through to the client reset.
      console.error('resetDemo failed', e);
    }
    // Client resets (role, nav, onboarding), then a hard refresh so the now-empty
    // lists are re-fetched from the backend (a plain re-fetch would keep stale
    // rows because upsert merges rather than replaces).
    setCustomerApplicantId(null);
    setCustView('landing');
    setCustAppId(null);
    setCalcAmount(15000);
    setStaffTab('inbox');
    setStaffDetailId(null);
    setRole('customer');
    setError(null);
    resetOnboarding();
    window.location.reload();
  };

  // ---- Customer router ----------------------------------------------------
  const custApp = findApp(custAppId);
  const custLoan = findLoanByApp(custAppId);
  const customerBody = (() => {
    switch (custView) {
      case 'landing':
        return <LandingScreen calcAmount={calcAmount} setCalcAmount={setCalcAmount} onApply={() => setCustView('apply')} />;
      case 'apply':
        return <ApplyScreen initialAmount={calcAmount} onSubmit={handleCustomerSubmit} onBack={() => setCustView('landing')} submitting={busy} />;
      case 'submitted':
        return custApp ? <SubmittedScreen application={custApp} onViewMyLoans={() => setCustView('myloans')} onHome={() => setCustView('landing')} /> : null;
      case 'myloans':
        return <MyLoansScreen applications={customerApps} loans={loans} onManage={handleManage} onApplyNew={() => setCustView('apply')} />;
      case 'dashboard':
        return custApp && custLoan ? <DashboardScreen loan={custLoan} application={custApp} payments={payments} onPay={() => setCustView('payment')} /> : <MyLoansScreen applications={customerApps} loans={loans} onManage={handleManage} onApplyNew={() => setCustView('apply')} />;
      case 'payment':
        return custApp && custLoan ? <PaymentScreen applicantId={custApp.applicantId} remainingBalance={custApp.remainingBalance ?? custLoan.loanAmount} onSubmit={handlePayment} onBack={() => setCustView('dashboard')} submitting={busy} /> : null;
      case 'payoff':
        return custApp && custLoan ? <PayoffScreen loan={custLoan} application={custApp} payments={payments} onBackToLoans={() => setCustView('myloans')} onRestart={restart} /> : null;
      default:
        return null;
    }
  })();

  // ---- Staff router -------------------------------------------------------
  const staffApp = findApp(staffDetailId);
  const staffBody = (() => {
    if (staffTab === 'dashboard') {
      return <StaffAnalyticsScreen />;
    }
    if (staffTab === 'loans') {
      return <StaffLoansScreen loans={loans} applications={applications} />;
    }
    if (staffDetailId && staffApp) {
      return <StaffDetailScreen application={staffApp} applicant={findApplicant(staffApp.applicantId)} onApprove={handleApprove} onReject={handleReject} onBack={() => setStaffDetailId(null)} submitting={busy} />;
    }
    return <StaffInboxScreen applications={applications} loans={loans} onOpen={id => setStaffDetailId(id)} />;
  })();

  // ---- Role-specific sub-nav ---------------------------------------------
  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    badge?: number;
  }> = ({
    active,
    onClick,
    children,
    badge
  }) => <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-[#eff6ff] text-[#1d4ed8]' : 'text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]'}`}>

      {children}
      {typeof badge === 'number' && badge > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold leading-none text-white">
          {badge}
        </span>}
    </button>;
  return <div className="min-h-screen w-full bg-[#f5f7fb] text-[#101828]" style={{
    fontFamily: "'Inter', system-ui, sans-serif"
  }}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="mb-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[#2563eb]">
                <IconLogo size={30} />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight text-[#101828]">Northline Capital</div>
                <div className="text-[11px] text-[#98a2b3]">
                  {role === 'customer' ? 'Customer portal demo' : 'Staff console demo'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Segmented ariaLabel="Switch role" value={role} onChange={v => setRole(v as Role)} options={[{
              value: 'customer',
              label: 'Customer',
              icon: <IconUser size={14} />
            }, {
              value: 'staff',
              label: 'Northline Staff',
              icon: <IconBriefcase size={14} />,
              badge: pendingCount
            }]} />

              <button onClick={restart} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d0d5dd] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#475467] transition-colors hover:bg-[#f9fafb]">

                <IconRepay size={13} />
                Reset
              </button>
            </div>
          </div>

          {/* Sub-nav */}
          <nav className="flex flex-wrap items-center gap-1 border-t border-[#e6e9ef] pt-3">
            {role === 'customer' ? <>
                <NavButton active={custView === 'landing' || custView === 'apply'} onClick={() => setCustView('landing')}>
                  <IconHome size={15} />
                  Home
                </NavButton>
                <NavButton active={custView === 'myloans' || custView === 'submitted' || custView === 'dashboard' || custView === 'payment' || custView === 'payoff'} onClick={() => setCustView('myloans')} badge={customerApps.length}>

                  <IconLayers size={15} />
                  My loans
                </NavButton>
              </> : <>
                <NavButton active={staffTab === 'inbox'} onClick={() => {
              setStaffTab('inbox');
              setStaffDetailId(null);
            }} badge={pendingCount}>

                  <IconInbox size={15} />
                  Applications
                </NavButton>
                <NavButton active={staffTab === 'loans'} onClick={() => setStaffTab('loans')}>
                  <IconLayers size={15} />
                  Loans
                </NavButton>
                <NavButton active={staffTab === 'dashboard'} onClick={() => {
              setStaffTab('dashboard');
              setStaffDetailId(null);
            }}>
                  <IconChart size={15} />
                  Dashboard
                </NavButton>
              </>}
          </nav>
        </header>

        {/* Async status: error banner + subtle sync hint */}
        {error && <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
            <span className="min-w-0">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 font-semibold text-[#b91c1c] hover:underline">
              Dismiss
            </button>
          </div>}
        {syncing && !error && <div className="mb-4 text-[11px] text-[#98a2b3]">Syncing with server…</div>}

        {/* Body */}
        <main className="flex flex-1 flex-col justify-start">
          <div key={`${role}-${role === 'customer' ? custView : staffTab + (staffDetailId ?? '')}`} className="mp-fade">
            {role === 'customer' ? customerBody : staffBody}
          </div>
        </main>

        <footer className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#98a2b3]">
          Wired to the live Northline API. Both roles read &amp; write the same MySQL-backed records. Field names &amp; status values mirror the production API.
        </footer>
      </div>

      {/* Customer-only floating AI copilot. Fed the current customer's applicant
          id from the store; null until they apply (panel shows a friendly note). */}
      {role === 'customer' && <CopilotChat applicantId={customerApplicantId} />}

      {/* First-run welcome modal (shown once, remembered in localStorage). */}
      <WelcomeModal />
    </div>;
};
