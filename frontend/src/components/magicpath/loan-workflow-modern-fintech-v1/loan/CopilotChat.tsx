import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as api from '@/lib/api';
import type { CopilotMessage } from '@/lib/api';
import { IconChat, IconSend, IconSpark, IconX } from './icons';

// ---------------------------------------------------------------------------
// Northline Assistant — the customer-facing borrower copilot.
//
// A floating launcher (bottom-right) opens a chat panel. The panel keeps the
// full multi-turn history in local state and calls POST /api/copilot/applicant/
// {applicantId} (via api.askCopilot) for each turn. Assistant replies are
// markdown (headers + GFM tables) and are rendered through react-markdown;
// user messages stay plain-text bubbles.
//
// Identity: the applicant id comes from the orchestrator (customerApplicantId).
// If it is null (the customer hasn't applied yet) the panel shows a friendly
// inline note and disables sending — it never calls the API without an id.
//
// This component is only mounted in the Customer role, so the launcher is
// inherently customer-only.
// ---------------------------------------------------------------------------

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatTurn = {
  role: 'assistant',
  content:
    "Hi! I'm the **Northline Assistant**. Ask me anything about your loan, " +
    'whether you can afford it, what happens if you pay extra, how the interest ' +
    "works, or your payoff timeline. I'll use your real numbers.",
};

const STARTERS = [
  'Can I afford my loan?',
  'What if I pay extra each month?',
  'How does the interest work?',
] as const;

const UNAVAILABLE_MSG =
  'The assistant is unavailable right now. Try again in a moment.';

// ---------------------------------------------------------------------------
// Markdown renderer for assistant messages. Compact, readable styling tuned to
// the cool-blue fintech theme; numbers in tables use tabular-nums so digits
// align. Kept to a small element map so replies (## headers, GFM tables, lists)
// look clean without a heavyweight prose plugin.
// ---------------------------------------------------------------------------
const AssistantMarkdown: React.FC<{ content: string }> = ({ content }) => (
  <div className="text-sm leading-relaxed text-[#1d2939] [word-break:break-word]">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, ...p }) => (
          <h1 className="mb-1.5 mt-2 text-[15px] font-semibold text-[#101828] first:mt-0" {...p} />
        ),
        h2: ({ node, ...p }) => (
          <h2 className="mb-1.5 mt-2 text-sm font-semibold text-[#101828] first:mt-0" {...p} />
        ),
        h3: ({ node, ...p }) => (
          <h3 className="mb-1 mt-2 text-[13px] font-semibold text-[#344054] first:mt-0" {...p} />
        ),
        p: ({ node, ...p }) => <p className="my-1.5 first:mt-0 last:mb-0" {...p} />,
        ul: ({ node, ...p }) => <ul className="my-1.5 list-disc space-y-1 pl-4" {...p} />,
        ol: ({ node, ...p }) => <ol className="my-1.5 list-decimal space-y-1 pl-4" {...p} />,
        li: ({ node, ...p }) => <li className="marker:text-[#98a2b3]" {...p} />,
        strong: ({ node, ...p }) => <strong className="font-semibold text-[#101828]" {...p} />,
        a: ({ node, ...p }) => (
          <a className="font-medium text-[#2563eb] underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />
        ),
        code: ({ node, ...p }) => (
          <code className="rounded bg-[#eef2f7] px-1 py-0.5 font-mono text-[12px] text-[#344054]" {...p} />
        ),
        table: ({ node, ...p }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-[12px] tabular-nums" {...p} />
          </div>
        ),
        thead: ({ node, ...p }) => <thead className="bg-[#f8fafc]" {...p} />,
        th: ({ node, ...p }) => (
          <th className="border border-[#e6e9ef] px-2.5 py-1.5 text-left font-semibold text-[#475467]" {...p} />
        ),
        td: ({ node, ...p }) => (
          <td className="border border-[#e6e9ef] px-2.5 py-1.5 text-[#344054] tabular-nums" {...p} />
        ),
        blockquote: ({ node, ...p }) => (
          <blockquote className="my-1.5 border-l-2 border-[#d0d5dd] pl-3 text-[#667085]" {...p} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

// Three-dot "thinking…" indicator shown while a reply is in flight.
const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[#e6e9ef] bg-white px-3.5 py-3">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#98a2b3]"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

export const CopilotChat: React.FC<{ applicantId: string | null }> = ({ applicantId }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasApplicant = applicantId != null;
  // A real conversation has started once the user has sent at least one turn.
  const started = messages.some(m => m.role === 'user');

  // Keep the view pinned to the newest message / typing indicator.
  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, open]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking || !hasApplicant) return;

    const history: ChatTurn[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setInput('');
    setError(null);
    setThinking(true);

    // The backend requires the first message to have role "user"; the seeded
    // greeting is assistant-only UI, so drop any leading assistant turns before
    // sending. The last turn is always the user message we just appended.
    let start = 0;
    while (start < history.length && history[start].role === 'assistant') start++;
    const payload: CopilotMessage[] = history
      .slice(start)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await api.askCopilot(Number(applicantId), payload);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setError(UNAVAILABLE_MSG);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Launcher — fixed bottom-right, customer-only (this component is only
          mounted in the Customer role). */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Northline Assistant"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition-all duration-150 hover:bg-[#1d4ed8] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
        >
          <IconChat size={18} />
          <span className="hidden sm:inline">Ask Northline</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 flex h-[min(600px,80vh)] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[#e6e9ef] bg-white shadow-[0_24px_64px_-16px_rgba(16,24,40,0.35)] sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[#e6e9ef] bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <IconSpark size={18} />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Northline Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-[#f9fafb] px-3.5 py-4">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[#2563eb] px-3.5 py-2.5 text-sm leading-relaxed text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-[#e6e9ef] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                    <AssistantMarkdown content={m.content} />
                  </div>
                </div>
              ),
            )}

            {thinking && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}

            {/* Starter-prompt chips — shown before the first user turn. */}
            {hasApplicant && !started && !thinking && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-[#d0d5dd] bg-white px-3 py-1.5 text-xs font-medium text-[#475467] transition-colors hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#1d4ed8]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* No-applicant note / error / composer */}
          <div className="border-t border-[#e6e9ef] bg-white px-3.5 py-3">
            {!hasApplicant && (
              <div className="mb-2.5 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs leading-relaxed text-[#1d4ed8]">
                Apply for a loan first and I can give you advice tailored to your situation.
              </div>
            )}
            {error && (
              <div className="mb-2.5 flex items-start justify-between gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs leading-relaxed text-[#b91c1c]">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="shrink-0 font-semibold hover:underline">
                  Dismiss
                </button>
              </div>
            )}
            <form
              onSubmit={e => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-end gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={!hasApplicant || thinking}
                placeholder={hasApplicant ? 'Ask about your loan…' : 'Apply for a loan to start chatting'}
                className="min-w-0 flex-1 rounded-xl border border-[#d0d5dd] bg-white px-3.5 py-2.5 text-sm text-[#101828] placeholder:text-[#98a2b3] transition-shadow duration-150 focus:border-[#2563eb] focus:outline-none focus:ring-4 focus:ring-[#eff6ff] disabled:cursor-not-allowed disabled:bg-[#f9fafb]"
              />
              <button
                type="submit"
                disabled={!hasApplicant || thinking || !input.trim()}
                aria-label="Send message"
                className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-white transition-colors hover:bg-[#1d4ed8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <IconSend size={18} />
              </button>
            </form>
            <div className="mt-2 text-center text-[10px] text-[#98a2b3]">
              Informational only. Not binding financial advice.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
