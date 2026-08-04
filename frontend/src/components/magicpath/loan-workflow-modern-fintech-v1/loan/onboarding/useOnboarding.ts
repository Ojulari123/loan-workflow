import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// useOnboarding — first-run coaching state, persisted to localStorage.
//
// This app has NO auth (the Customer / Staff header toggle is client-side), so
// onboarding lives in a single public localStorage namespace shared by everyone
// on the device.
//
// The state is held in a tiny module-level store wired to React via
// useSyncExternalStore, so every consumer (the top-level WelcomeModal AND each
// page's FirstVisitTip) stays in sync. That matters for the header "Reset"
// button: it calls resetOnboarding() from one place and every mounted tip /
// modal reacts immediately, re-triggering the welcome + tips without a reload.
//
// A per-instance "mounted" guard means the first render never reads storage, so
// returning users don't see the modal / tips flash before hydration.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'northline_onboarding_v1';

export interface OnboardingState {
  welcomeSeen: boolean;
  tipsSeen: string[];
}

const EMPTY: OnboardingState = { welcomeSeen: false, tipsSeen: [] };

// ---- Module store (client-side, shared across all hook instances) ----------
let state: OnboardingState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function parse(raw: string | null): OnboardingState {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      welcomeSeen: !!parsed.welcomeSeen,
      tipsSeen: Array.isArray(parsed.tipsSeen)
        ? parsed.tipsSeen.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function persist(next: OnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage disabled / over quota — keep in-memory state only */
  }
}

// Read localStorage exactly once, lazily, on the client. Idempotent.
function ensureHydrated(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  const loaded = parse(window.localStorage.getItem(STORAGE_KEY));
  if (loaded.welcomeSeen !== state.welcomeSeen || loaded.tipsSeen.length !== state.tipsSeen.length) {
    state = loaded;
    emit();
  } else {
    state = loaded;
  }
}

function setState(next: OnboardingState): void {
  state = next;
  persist(next);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): OnboardingState {
  return state;
}

// Server / first-paint snapshot: always the neutral empty state so SSR and the
// initial client render agree.
function getServerSnapshot(): OnboardingState {
  return EMPTY;
}

// ---- Public hook -----------------------------------------------------------
export interface UseOnboarding {
  /** True only after the first client-side effect has run (storage is safe to trust). */
  mounted: boolean;
  welcomeSeen: boolean;
  tipsSeen: string[];
  markWelcomeSeen: () => void;
  isTipSeen: (id: string) => boolean;
  markTipSeen: (id: string) => void;
  resetOnboarding: () => void;
}

export function useOnboarding(): UseOnboarding {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ensureHydrated();
    setMounted(true);
  }, []);

  const markWelcomeSeen = useCallback(() => {
    if (state.welcomeSeen) return;
    setState({ ...state, welcomeSeen: true });
  }, []);

  const isTipSeen = useCallback((id: string) => snap.tipsSeen.includes(id), [snap.tipsSeen]);

  const markTipSeen = useCallback((id: string) => {
    if (state.tipsSeen.includes(id)) return;
    setState({ ...state, tipsSeen: [...state.tipsSeen, id] });
  }, []);

  const resetOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    // Keep `hydrated` true — we've intentionally cleared, not un-read.
    setState({ welcomeSeen: false, tipsSeen: [] });
  }, []);

  return { mounted, welcomeSeen: snap.welcomeSeen, tipsSeen: snap.tipsSeen, markWelcomeSeen, isTipSeen, markTipSeen, resetOnboarding };
}
