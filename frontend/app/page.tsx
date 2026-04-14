"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Inline SVG diagrams ──────────────────────────────────────────────────────

// Simple NFA for symbol 'a': q0 --a--> q1
function SVGSymbol() {
  return (
    <svg viewBox="0 0 220 80" className="w-full max-w-xs mx-auto" aria-label="NFA for symbol a">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4fc3f7" />
        </marker>
        <marker id="arr-start" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
        </marker>
      </defs>
      {/* start arrow */}
      <line x1="10" y1="40" x2="48" y2="40" stroke="#7c4dff" strokeWidth="1.5" markerEnd="url(#arr-start)" />
      {/* q0 */}
      <circle cx="70" cy="40" r="20" fill="#2d1b69" stroke="#7c4dff" strokeWidth="2" />
      <text x="70" y="45" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">q0</text>
      {/* edge a */}
      <line x1="90" y1="40" x2="128" y2="40" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#arr)" />
      <text x="109" y="33" textAnchor="middle" fill="#a8d8ea" fontSize="12" fontWeight="bold">a</text>
      {/* q1 accept */}
      <circle cx="150" cy="40" r="20" fill="#0d2f3f" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="150" cy="40" r="26" fill="none" stroke="#00e5ff" strokeWidth="1.5" />
      <text x="150" y="45" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">q1</text>
    </svg>
  );
}

// NFA for a|b
function SVGUnion() {
  return (
    <svg viewBox="0 0 340 160" className="w-full max-w-sm mx-auto" aria-label="NFA for a|b">
      <defs>
        <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4fc3f7" />
        </marker>
        <marker id="arr2s" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
        </marker>
        <marker id="arr2e" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
        </marker>
      </defs>
      {/* start arrow */}
      <line x1="5" y1="80" x2="43" y2="80" stroke="#7c4dff" strokeWidth="1.5" markerEnd="url(#arr2s)" />
      {/* new start */}
      <circle cx="65" cy="80" r="20" fill="#2d1b69" stroke="#7c4dff" strokeWidth="2" />
      <text x="65" y="85" textAnchor="middle" fill="#e6f1ff" fontSize="12" fontWeight="bold">q0</text>
      {/* ε to q1 (top) */}
      <path d="M80,68 Q130,30 148,38" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr2e)" strokeDasharray="4,2" />
      <text x="115" y="30" fill="#7c4dff" fontSize="11">ε</text>
      {/* ε to q3 (bottom) */}
      <path d="M80,92 Q130,130 148,122" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr2e)" strokeDasharray="4,2" />
      <text x="115" y="135" fill="#7c4dff" fontSize="11">ε</text>
      {/* q1 */}
      <circle cx="170" cy="40" r="18" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="170" y="45" textAnchor="middle" fill="#e6f1ff" fontSize="12">q1</text>
      {/* a */}
      <line x1="188" y1="40" x2="218" y2="40" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#arr2)" />
      <text x="203" y="33" textAnchor="middle" fill="#a8d8ea" fontSize="11">a</text>
      {/* q2 */}
      <circle cx="238" cy="40" r="18" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="238" y="45" textAnchor="middle" fill="#e6f1ff" fontSize="12">q2</text>
      {/* q3 */}
      <circle cx="170" cy="120" r="18" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="170" y="125" textAnchor="middle" fill="#e6f1ff" fontSize="12">q3</text>
      {/* b */}
      <line x1="188" y1="120" x2="218" y2="120" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#arr2)" />
      <text x="203" y="113" textAnchor="middle" fill="#a8d8ea" fontSize="11">b</text>
      {/* q4 */}
      <circle cx="238" cy="120" r="18" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="238" y="125" textAnchor="middle" fill="#e6f1ff" fontSize="12">q4</text>
      {/* ε from q2 to new accept */}
      <path d="M254,40 Q290,60 290,80" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr2e)" strokeDasharray="4,2" />
      <text x="295" y="55" fill="#7c4dff" fontSize="11">ε</text>
      {/* ε from q4 to new accept */}
      <path d="M254,120 Q290,100 290,80" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr2e)" strokeDasharray="4,2" />
      <text x="295" y="110" fill="#7c4dff" fontSize="11">ε</text>
      {/* new accept */}
      <circle cx="310" cy="80" r="18" fill="#0d2f3f" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="310" cy="80" r="24" fill="none" stroke="#00e5ff" strokeWidth="1.5" />
      <text x="310" y="85" textAnchor="middle" fill="#e6f1ff" fontSize="12">q5</text>
    </svg>
  );
}

// NFA for a* (Kleene star)
function SVGKleene() {
  return (
    <svg viewBox="0 0 300 120" className="w-full max-w-sm mx-auto" aria-label="NFA for a*">
      <defs>
        <marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4fc3f7" />
        </marker>
        <marker id="arr3e" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
        </marker>
        <marker id="arr3s" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
        </marker>
      </defs>
      {/* start arrow */}
      <line x1="5" y1="60" x2="43" y2="60" stroke="#7c4dff" strokeWidth="1.5" markerEnd="url(#arr3s)" />
      {/* new start q0 */}
      <circle cx="65" cy="60" r="20" fill="#2d1b69" stroke="#7c4dff" strokeWidth="2" />
      <text x="65" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12">q0</text>
      {/* ε to q1 */}
      <line x1="85" y1="60" x2="118" y2="60" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr3e)" strokeDasharray="4,2" />
      <text x="102" y="53" fill="#7c4dff" fontSize="11">ε</text>
      {/* q1 */}
      <circle cx="140" cy="60" r="20" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="140" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12">q1</text>
      {/* a */}
      <line x1="160" y1="60" x2="193" y2="60" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#arr3)" />
      <text x="177" y="53" fill="#a8d8ea" fontSize="11">a</text>
      {/* q2 */}
      <circle cx="215" cy="60" r="20" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="215" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12">q2</text>
      {/* loop back q2 → q1 */}
      <path d="M215,40 Q177,10 140,40" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr3e)" strokeDasharray="4,2" />
      <text x="177" y="12" fill="#7c4dff" fontSize="11">ε</text>
      {/* ε to new accept */}
      <line x1="235" y1="60" x2="263" y2="60" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr3e)" strokeDasharray="4,2" />
      <text x="249" y="53" fill="#7c4dff" fontSize="11">ε</text>
      {/* ε from q0 to new accept (skip) */}
      <path d="M65,80 Q165,110 263,80" stroke="#7c4dff" strokeWidth="1.2" fill="none" markerEnd="url(#arr3e)" strokeDasharray="4,2" />
      <text x="165" y="108" fill="#7c4dff" fontSize="11">ε</text>
      {/* new accept q3 */}
      <circle cx="280" cy="60" r="16" fill="#0d2f3f" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="280" cy="60" r="22" fill="none" stroke="#00e5ff" strokeWidth="1.5" />
      <text x="280" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12">q3</text>
    </svg>
  );
}

// DFA for (a|b)*abb — 4 states
function SVGDFAabb() {
  return (
    <svg viewBox="0 0 420 120" className="w-full max-w-lg mx-auto" aria-label="DFA for (a|b)*abb">
      <defs>
        <marker id="da" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4fc3f7" />
        </marker>
        <marker id="das" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
        </marker>
      </defs>
      {/* start arrow */}
      <line x1="5" y1="60" x2="38" y2="60" stroke="#7c4dff" strokeWidth="1.5" markerEnd="url(#das)" />
      {/* D0 */}
      <circle cx="60" cy="60" r="22" fill="#2d1b69" stroke="#7c4dff" strokeWidth="2" />
      <text x="60" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12" fontWeight="bold">D0</text>
      {/* D0 -a-> D1 */}
      <line x1="82" y1="60" x2="118" y2="60" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#da)" />
      <text x="100" y="52" textAnchor="middle" fill="#a8d8ea" fontSize="11">a</text>
      {/* D0 -b-> D0 self loop */}
      <path d="M50,38 Q30,10 70,38" stroke="#4fc3f7" strokeWidth="1.5" fill="none" markerEnd="url(#da)" />
      <text x="50" y="12" fill="#a8d8ea" fontSize="11">b</text>
      {/* D1 */}
      <circle cx="140" cy="60" r="22" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="140" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12" fontWeight="bold">D1</text>
      {/* D1 -a-> D1 self loop */}
      <path d="M130,38 Q140,10 150,38" stroke="#4fc3f7" strokeWidth="1.5" fill="none" markerEnd="url(#da)" />
      <text x="140" y="12" fill="#a8d8ea" fontSize="11">a</text>
      {/* D1 -b-> D2 */}
      <line x1="162" y1="60" x2="198" y2="60" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#da)" />
      <text x="180" y="52" textAnchor="middle" fill="#a8d8ea" fontSize="11">b</text>
      {/* D2 */}
      <circle cx="220" cy="60" r="22" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="2" />
      <text x="220" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12" fontWeight="bold">D2</text>
      {/* D2 -a-> D1 (back arc) */}
      <path d="M210,38 Q175,5 150,38" stroke="#4fc3f7" strokeWidth="1.5" fill="none" markerEnd="url(#da)" />
      <text x="180" y="5" fill="#a8d8ea" fontSize="11">a</text>
      {/* D2 -b-> D3 */}
      <line x1="242" y1="60" x2="278" y2="60" stroke="#4fc3f7" strokeWidth="1.5" markerEnd="url(#da)" />
      <text x="260" y="52" textAnchor="middle" fill="#a8d8ea" fontSize="11">b</text>
      {/* D3 accept */}
      <circle cx="300" cy="60" r="22" fill="#0d2f3f" stroke="#00e5ff" strokeWidth="2.5" />
      <circle cx="300" cy="60" r="28" fill="none" stroke="#00e5ff" strokeWidth="1.5" />
      <text x="300" y="65" textAnchor="middle" fill="#e6f1ff" fontSize="12" fontWeight="bold">D3</text>
      {/* D3 -a-> D1 (long back arc) */}
      <path d="M290,82 Q220,110 150,82" stroke="#4fc3f7" strokeWidth="1.5" fill="none" markerEnd="url(#da)" />
      <text x="220" y="112" fill="#a8d8ea" fontSize="11">a</text>
      {/* D3 -b-> D0 (long back arc) */}
      <path d="M300,88 Q180,115 70,88" stroke="#4fc3f7" strokeWidth="1.5" fill="none" markerEnd="url(#da)" />
      <text x="185" y="118" fill="#a8d8ea" fontSize="11">b</text>
    </svg>
  );
}

// Partition refinement diagram
function SVGPartition() {
  return (
    <svg viewBox="0 0 360 140" className="w-full max-w-sm mx-auto" aria-label="Partition refinement">
      {/* Initial partition */}
      <rect x="10" y="10" width="150" height="55" rx="8" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="1.5" />
      <text x="85" y="28" textAnchor="middle" fill="#8ab4cc" fontSize="10">Non-accepting</text>
      <text x="85" y="50" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">D0, D1, D2</text>
      <rect x="170" y="10" width="100" height="55" rx="8" fill="#0d2f3f" stroke="#00e5ff" strokeWidth="1.5" />
      <text x="220" y="28" textAnchor="middle" fill="#8ab4cc" fontSize="10">Accepting</text>
      <text x="220" y="50" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">D3</text>
      <text x="180" y="82" textAnchor="middle" fill="#8ab4cc" fontSize="10">↓ refine</text>
      {/* After refinement */}
      <rect x="10" y="90" width="70" height="45" rx="8" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="1.5" />
      <text x="45" y="118" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">D0</text>
      <rect x="90" y="90" width="70" height="45" rx="8" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="1.5" />
      <text x="125" y="118" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">D1, D2</text>
      <rect x="170" y="90" width="100" height="45" rx="8" fill="#0d2f3f" stroke="#00e5ff" strokeWidth="1.5" />
      <text x="220" y="118" textAnchor="middle" fill="#e6f1ff" fontSize="13" fontWeight="bold">D3</text>
      <text x="310" y="118" textAnchor="middle" fill="#8ab4cc" fontSize="10">= M0 M1 M2</text>
    </svg>
  );
}

// ─── Tooltip component ────────────────────────────────────────────────────────
function Tip({ term, children }: { term: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <span
        className="border-b border-dashed border-primary cursor-help text-primary"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {term}
      </span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-xl leading-relaxed pointer-events-none">
          {children}
        </span>
      )}
    </span>
  );
}

// ─── Accordion section ────────────────────────────────────────────────────────
function Section({
  id,
  badge,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-lg">
          {badge}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-base">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
        </div>
        <span className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-border animate-slide-up">
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────
function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 text-sm">
      {children}
    </code>
  );
}

// ─── Keyword highlight ────────────────────────────────────────────────────────
function KW({ children }: { children: React.ReactNode }) {
  return <span className="text-primary font-semibold">{children}</span>;
}

// ─── Thompson step-by-step interactive ───────────────────────────────────────
const THOMPSON_STEPS = [
  {
    title: "Step 1 — Symbol",
    desc: "For each literal symbol a, create two states q0 and q1 with a single transition q0 →a→ q1. q0 is the start, q1 is the accept state of this fragment.",
    diagram: <SVGSymbol />,
  },
  {
    title: "Step 2 — Union (A|B)",
    desc: "Create a new start state and a new accept state. Add ε-transitions from the new start to both A.start and B.start. Add ε-transitions from A.accept and B.accept to the new accept state.",
    diagram: <SVGUnion />,
  },
  {
    title: "Step 3 — Kleene Star (A*)",
    desc: "Create a new start and accept state. Add ε from new start → A.start and new start → new accept (zero repetitions). Add ε from A.accept → A.start (loop) and A.accept → new accept.",
    diagram: <SVGKleene />,
  },
  {
    title: "Step 4 — Concatenation (AB)",
    desc: "Connect A.accept to B.start with an ε-transition. The result has A.start as start and B.accept as accept. No new states are created — just one new ε-edge.",
    diagram: (
      <svg viewBox="0 0 300 80" className="w-full max-w-xs mx-auto">
        <defs>
          <marker id="ac" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4fc3f7" />
          </marker>
          <marker id="ace" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#7c4dff" />
          </marker>
        </defs>
        <rect x="10" y="20" width="100" height="40" rx="8" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="1.5" />
        <text x="60" y="45" textAnchor="middle" fill="#e6f1ff" fontSize="13">Fragment A</text>
        <line x1="110" y1="40" x2="148" y2="40" stroke="#7c4dff" strokeWidth="1.5" markerEnd="url(#ace)" strokeDasharray="4,2" />
        <text x="129" y="33" textAnchor="middle" fill="#7c4dff" fontSize="11">ε</text>
        <rect x="150" y="20" width="100" height="40" rx="8" fill="#1e3a5f" stroke="#4fc3f7" strokeWidth="1.5" />
        <text x="200" y="45" textAnchor="middle" fill="#e6f1ff" fontSize="13">Fragment B</text>
        <text x="60" y="72" textAnchor="middle" fill="#8ab4cc" fontSize="10">A.accept</text>
        <text x="200" y="72" textAnchor="middle" fill="#8ab4cc" fontSize="10">B.start</text>
      </svg>
    ),
  },
];

function ThompsonStepper() {
  const [step, setStep] = useState(0);
  const s = THOMPSON_STEPS[step];
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">{s.title}</span>
          <span className="text-xs text-muted-foreground">{step + 1} / {THOMPSON_STEPS.length}</span>
        </div>
        {s.diagram}
        <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold disabled:opacity-30 hover:border-primary/50 transition-all"
        >
          ← Prev
        </button>
        <div className="flex gap-1 items-center flex-1 justify-center">
          {THOMPSON_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-primary w-4" : "bg-border hover:bg-primary/50"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setStep(s => Math.min(THOMPSON_STEPS.length - 1, s + 1))}
          disabled={step === THOMPSON_STEPS.length - 1}
          className="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold disabled:opacity-30 hover:border-primary/50 transition-all"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────
function ComparisonTable() {
  const rows = [
    ["Feature",            "NFA",                    "DFA",                    "Min DFA"],
    ["States",             "Can be many (ε-states)", "Subset of NFA states",   "Minimal possible"],
    ["Transitions",        "Multiple per symbol",    "Exactly one per symbol", "Exactly one per symbol"],
    ["ε-transitions",      "Yes",                    "No",                     "No"],
    ["Simulation",         "Parallel state sets",    "Single state",           "Single state"],
    ["Construction",       "Thompson's (O(n))",      "Subset (O(2ⁿ) worst)",   "Hopcroft (O(n log n))"],
    ["Equivalence",        "Same language as DFA",   "Same language as NFA",   "Unique up to isomorphism"],
    ["Practical use",      "Regex compilation",      "Lexer tables",           "Optimized lexers"],
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            {rows[0].map((h, i) => (
              <th key={i} className={`px-4 py-3 text-left font-bold ${i === 0 ? "text-muted-foreground" : i === 1 ? "text-blue-400" : i === 2 ? "text-cyan-400" : "text-purple-400"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? "font-semibold text-muted-foreground text-xs uppercase tracking-wide" : "text-foreground"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
  {
    q: 'Which strings are accepted by (a|b)*abb?',
    opts: ["ab", "abb", "aabb", "bba"],
    correct: [1, 2],
    explain: '"abb" ends with abb. "aabb" = aa·bb → the (a|b)* part matches "aa", then "abb" matches. "ab" is too short. "bba" doesn\'t end with abb.',
  },
  {
    q: "How many states does Thompson's NFA for (a|b)*abb have?",
    opts: ["8", "10", "14", "16"],
    correct: [2],
    explain: "(a|b) = 6 states, (a|b)* = 8 states, then concatenating 'a', 'b', 'b' adds 2+2+2 = 6 more → 14 total.",
  },
  {
    q: "What does ε-closure({q0}) mean?",
    opts: [
      "All states reachable from q0 on input ε",
      "All states reachable from q0 via ε-transitions only",
      "The set of accepting states",
      "The start state of the DFA",
    ],
    correct: [1],
    explain: "ε-closure is the set of all states reachable from a given set of states by following zero or more ε-transitions, without consuming any input.",
  },
  {
    q: "Which algorithm minimizes a DFA?",
    opts: ["Thompson's construction", "Subset construction", "Hopcroft's algorithm", "Brzozowski's algorithm"],
    correct: [2, 3],
    explain: "Hopcroft's algorithm uses partition refinement in O(n log n). Brzozowski's algorithm (reverse, determinize, reverse, determinize) also produces the minimal DFA but is less efficient in the worst case.",
  },
];

function Quiz() {
  const [answers, setAnswers] = useState<Record<number, Set<number>>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const toggle = (qi: number, oi: number) => {
    if (revealed[qi]) return;
    setAnswers(prev => {
      const cur = new Set(prev[qi] ?? []);
      if (cur.has(oi)) cur.delete(oi); else cur.add(oi);
      return { ...prev, [qi]: cur };
    });
  };

  const check = (qi: number) => setRevealed(prev => ({ ...prev, [qi]: true }));

  return (
    <div className="space-y-6">
      {QUIZ.map((q, qi) => {
        const sel = answers[qi] ?? new Set<number>();
        const done = revealed[qi];
        return (
          <div key={qi} className="rounded-xl border border-border bg-background p-5 space-y-3">
            <p className="font-semibold text-sm text-foreground">{qi + 1}. {q.q}</p>
            <div className="space-y-2">
              {q.opts.map((opt, oi) => {
                const isSelected = sel.has(oi);
                const isCorrect  = q.correct.includes(oi);
                let cls = "border-border bg-card text-muted-foreground";
                if (done) {
                  if (isCorrect)  cls = "border-green-600 bg-green-900/30 text-green-300";
                  else if (isSelected) cls = "border-red-600 bg-red-900/30 text-red-300";
                } else if (isSelected) {
                  cls = "border-primary bg-primary/10 text-primary";
                }
                return (
                  <button
                    key={oi}
                    onClick={() => toggle(qi, oi)}
                    className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-all ${cls} ${!done ? "hover:border-primary/50" : ""}`}
                  >
                    <span className="font-mono mr-2 text-xs opacity-60">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {!done && sel.size > 0 && (
              <button
                onClick={() => check(qi)}
                className="rounded-lg bg-primary/10 border border-primary/30 text-primary px-4 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-all"
              >
                Check answer
              </button>
            )}
            {done && (
              <div className="rounded-lg bg-secondary/40 border border-border px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Explanation: </span>{q.explain}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Animated CTA button — navigates to /simulator with fade ─────────────────
function SimulatorCTA({ size = "md", label = "Try the Live Simulator →" }: { size?: "md" | "lg"; label?: string }) {
  const router = useRouter();
  const [fading, setFading] = useState(false);

  const go = () => {
    setFading(true);
    setTimeout(() => router.push("/simulator"), 280);
  };

  const base =
    "inline-flex items-center justify-center font-bold rounded-xl cursor-pointer select-none " +
    "transition-all duration-200 ease-out " +
    "bg-gradient-to-r from-primary to-[#4fc3f7] text-primary-foreground " +
    "shadow-[0_0_18px_rgba(0,229,255,0.35)] " +
    "hover:scale-105 hover:shadow-[0_0_28px_rgba(0,229,255,0.55)] active:scale-100";

  const sizes = {
    md: "px-6 py-3 text-sm gap-2",
    lg: "px-8 py-4 text-base gap-2.5",
  };

  return (
    <>
      {/* Full-page fade overlay */}
      <div
        className="fixed inset-0 bg-background pointer-events-none z-50 transition-opacity duration-300"
        style={{ opacity: fading ? 1 : 0 }}
      />
      <button onClick={go} className={`${base} ${sizes[size]}`}>
        {label}
      </button>
    </>
  );
}
const DYK = [
  { icon: "🔍", title: "Search engines", body: "Google's RE2 library uses DFAs to match billions of regex patterns per second with guaranteed linear-time performance." },
  { icon: "⚙️", title: "Compilers", body: "Every compiler's lexer (tokenizer) is a DFA. Tools like Flex generate optimized DFA tables directly from regex specifications." },
  { icon: "🧬", title: "Bioinformatics", body: "DNA sequence matching uses automata to scan genomes for patterns like TATA boxes and splice sites at gigabase scale." },
  { icon: "🛡️", title: "Security", body: "Intrusion detection systems (Snort, Suricata) use DFAs to match thousands of attack signatures simultaneously in network traffic." },
  { icon: "📱", title: "Input validation", body: "Every time you type an email or phone number into a form, a regex (compiled to a DFA) validates it in microseconds." },
  { icon: "🤖", title: "NLP", body: "Finite automata underpin tokenization in large language models — the first stage of processing before neural networks take over." },
];

// ─── Did You Know cards ───────────────────────────────────────────────────────
export default function TheoryPage() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-white">FA</span>
            </div>
            <span className="font-bold text-sm">RegexFA</span>
            <span className="text-muted-foreground text-xs hidden sm:block">/ Theory</span>
          </div>
          <div className="flex items-center gap-3">
            <SimulatorCTA size="md" label="Try the Live Simulator →" />
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs text-primary mb-6">
          Formal Language Theory
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground mb-4">
          From Regex to Automata
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          A rigorous, interactive guide to regular expressions, Thompson&apos;s construction,
          subset construction, and DFA minimization — the exact algorithms powering this tool.
        </p>
        {/* Hero CTA — immediately visible */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <SimulatorCTA size="lg" label="Try the Live Simulator →" />
          <span className="text-xs text-muted-foreground">or scroll down to learn the theory first</span>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {[
            ["#regex",    "Regular Expressions"],
            ["#nfa",      "NFA"],
            ["#dfa",      "DFA"],
            ["#thompson", "Thompson's Construction"],
            ["#subset",   "Subset Construction"],
            ["#minimize", "DFA Minimization"],
            ["#apps",     "Applications"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-20 space-y-4">

        {/* ── 1. Regular Expressions ─────────────────────────────────────── */}
        <Section id="regex" badge="①" title="Regular Expressions" subtitle="Formal notation for describing regular languages" defaultOpen>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              A <KW>regular expression</KW> (regex) is a concise notation for describing a set of strings — called a <KW>regular language</KW>. Formally, a regular language over alphabet Σ is any language that can be recognized by a <Tip term="finite automaton">A finite automaton is a mathematical model of computation with a finite number of states, transitions, and no memory beyond the current state.</Tip>.
            </p>
            <p>
              Regular expressions are defined inductively:
            </p>
            <div className="rounded-xl border border-border bg-background p-4 space-y-2 font-mono text-xs">
              <div><span className="text-primary">∅</span>  <span className="text-muted-foreground ml-4">— empty language (matches nothing)</span></div>
              <div><span className="text-primary">ε</span>  <span className="text-muted-foreground ml-4">— empty string (matches "")</span></div>
              <div><span className="text-primary">a</span>  <span className="text-muted-foreground ml-4">— literal symbol a ∈ Σ</span></div>
              <div><span className="text-primary">R|S</span> <span className="text-muted-foreground ml-3">— union: strings in R or S</span></div>
              <div><span className="text-primary">RS</span>  <span className="text-muted-foreground ml-3">— concatenation: string from R followed by string from S</span></div>
              <div><span className="text-primary">R*</span>  <span className="text-muted-foreground ml-3">— Kleene star: zero or more repetitions of R</span></div>
            </div>
            <p>
              This tool also supports <Code>R+</Code> (one or more, equivalent to <Code>RR*</Code>) and <Code>R?</Code> (zero or one, equivalent to <Code>R|ε</Code>).
            </p>
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-2">Examples</p>
              {[
                ["(a|b)*abb", "All strings over {a,b} ending in 'abb'"],
                ["a*b*",      "Zero or more a's followed by zero or more b's"],
                ["(ab)+",     "One or more repetitions of 'ab'"],
                ["a?b",       "Optional 'a' followed by 'b' — matches 'b' or 'ab'"],
              ].map(([re, desc]) => (
                <div key={re} className="flex items-start gap-3">
                  <code className="shrink-0 font-mono text-primary bg-primary/10 border border-primary/20 rounded px-2 py-0.5 text-xs">{re}</code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
            <p>
              <KW>Kleene&apos;s theorem</KW> states that the class of languages described by regular expressions is exactly the class recognized by finite automata. This is why converting regex → NFA → DFA is always possible and always correct.
            </p>
          </div>
        </Section>

        {/* ── 2. NFA ─────────────────────────────────────────────────────── */}
        <Section id="nfa" badge="②" title="Nondeterministic Finite Automaton (NFA)" subtitle="Multiple possible transitions, including ε-moves">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              An <KW>NFA</KW> is a 5-tuple <span className="font-mono text-foreground">(Q, Σ, δ, q₀, F)</span> where:
            </p>
            <div className="rounded-xl border border-border bg-background p-4 space-y-1.5 text-xs font-mono">
              <div><span className="text-primary">Q</span>  <span className="text-muted-foreground ml-4">finite set of states</span></div>
              <div><span className="text-primary">Σ</span>  <span className="text-muted-foreground ml-4">finite input alphabet</span></div>
              <div><span className="text-primary">δ: Q × (Σ ∪ {"{ε}"}) → 2^Q</span>  <span className="text-muted-foreground ml-4">transition function (returns a SET of states)</span></div>
              <div><span className="text-primary">q₀ ∈ Q</span>  <span className="text-muted-foreground ml-2">start state</span></div>
              <div><span className="text-primary">F ⊆ Q</span>  <span className="text-muted-foreground ml-3">set of accepting states</span></div>
            </div>
            <p>
              The key difference from a DFA: δ returns a <em>set</em> of states (possibly empty), and transitions on <Tip term="ε (epsilon)">An ε-transition allows the automaton to change state without consuming any input symbol. It represents a "free move".</Tip> are allowed. An NFA <KW>accepts</KW> a string if <em>any</em> possible execution path ends in an accepting state.
            </p>
            <p>
              <KW>ε-closure(S)</KW> is the set of all states reachable from any state in S by following zero or more ε-transitions. This is computed with a simple BFS/DFS.
            </p>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-foreground mb-3">NFA for symbol &apos;a&apos;</p>
              <SVGSymbol />
              <p className="text-xs text-center text-muted-foreground mt-2">q0 is start (purple), q1 is accept (double circle)</p>
            </div>
          </div>
        </Section>

        {/* ── 3. DFA ─────────────────────────────────────────────────────── */}
        <Section id="dfa" badge="③" title="Deterministic Finite Automaton (DFA)" subtitle="Exactly one transition per state per symbol">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              A <KW>DFA</KW> is also a 5-tuple <span className="font-mono text-foreground">(Q, Σ, δ, q₀, F)</span>, but the transition function is <KW>total and deterministic</KW>:
            </p>
            <div className="rounded-xl border border-border bg-background p-4 text-xs font-mono">
              <div><span className="text-primary">δ: Q × Σ → Q</span>  <span className="text-muted-foreground ml-4">exactly one next state for every (state, symbol) pair</span></div>
            </div>
            <p>
              No ε-transitions. No ambiguity. For every input string, there is exactly one execution path. A DFA accepts a string iff the unique path ends in an accepting state.
            </p>
            <p>
              DFAs are <KW>equivalent in expressive power</KW> to NFAs — they recognize exactly the same class of languages (regular languages). But DFAs can be exponentially larger: an NFA with n states may require up to 2ⁿ DFA states in the worst case.
            </p>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-foreground mb-3">DFA for (a|b)*abb — 4 states</p>
              <SVGDFAabb />
              <p className="text-xs text-center text-muted-foreground mt-2">D3 is the only accepting state (double circle)</p>
            </div>
          </div>
        </Section>

        {/* ── 4. Thompson's Construction ─────────────────────────────────── */}
        <Section id="thompson" badge="④" title="Thompson's Construction" subtitle="Regex → ε-NFA in O(n) time and space">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <KW>Thompson&apos;s construction</KW> (Ken Thompson, 1968) converts a regular expression to an ε-NFA with at most <span className="font-mono text-foreground">2n</span> states, where n is the number of symbols and operators in the regex. It works by structural induction on the regex.
            </p>
            <p>
              <strong className="text-foreground">Key invariant:</strong> every fragment produced has exactly one start state and one accept state. Fragments are composed by adding ε-transitions between them.
            </p>
            <ThompsonStepper />
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1">
              <p className="font-bold text-primary">Correctness guarantee</p>
              <p>The resulting NFA recognizes exactly the language described by the regex. This is proven by structural induction: each base case (symbol) is trivially correct, and each inductive step (union, concat, star) preserves the language.</p>
            </div>
            <p>
              For <Code>(a|b)*abb</Code>, Thompson&apos;s construction produces exactly <KW>14 states</KW>:
              8 for <Code>(a|b)*</Code>, plus 2+2+2 for the three literal symbols.
            </p>
          </div>
        </Section>

        {/* ── 5. Subset Construction ─────────────────────────────────────── */}
        <Section id="subset" badge="⑤" title="Subset Construction (NFA → DFA)" subtitle="Powerset construction — O(2ⁿ) worst case, often much less">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              The <KW>subset construction</KW> (also called powerset construction) converts an NFA to an equivalent DFA. Each DFA state corresponds to a <em>set</em> of NFA states.
            </p>
            <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-xs font-mono">
              <p className="text-foreground font-bold text-sm font-sans">Algorithm</p>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="text-primary">1.</span> D₀ = ε-closure({"{"} q₀ {"}"})</p>
                <p><span className="text-primary">2.</span> worklist = [D₀]</p>
                <p><span className="text-primary">3.</span> while worklist not empty:</p>
                <p className="pl-4">D = worklist.pop()</p>
                <p className="pl-4">for each symbol a ∈ Σ:</p>
                <p className="pl-8">T = ε-closure(move(D, a))</p>
                <p className="pl-8">if T not seen: add T to DFA, push to worklist</p>
                <p className="pl-8">add transition D →a→ T</p>
                <p><span className="text-primary">4.</span> D is accepting iff it contains any NFA accept state</p>
              </div>
            </div>
            <p>
              <KW>move(S, a)</KW> = all NFA states reachable from any state in S on symbol a (without ε-moves). Then ε-closure is applied to get all states reachable via ε from those.
            </p>
            <p>
              For <Code>(a|b)*abb</Code>, the NFA has 14 states but the DFA has only <KW>5 states</KW> (including one dead/trap state). In practice, the exponential blowup rarely occurs for typical regex patterns.
            </p>
          </div>
        </Section>

        {/* ── 6. DFA Minimization ────────────────────────────────────────── */}
        <Section id="minimize" badge="⑥" title="DFA Minimization (Hopcroft's Algorithm)" subtitle="Partition refinement — O(n log n) time">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              <KW>Hopcroft&apos;s algorithm</KW> (1971) finds the <em>unique</em> minimal DFA equivalent to a given DFA. Two states are <KW>distinguishable</KW> if there exists some string that is accepted from one but not the other.
            </p>
            <div className="rounded-xl border border-border bg-background p-4 space-y-3 text-xs font-mono">
              <p className="text-foreground font-bold text-sm font-sans">Algorithm (partition refinement)</p>
              <div className="space-y-1 text-muted-foreground">
                <p><span className="text-primary">0.</span> Remove unreachable states (BFS from start)</p>
                <p><span className="text-primary">1.</span> P = {"{"} F, Q\F {"}"} — accepting vs non-accepting</p>
                <p><span className="text-primary">2.</span> repeat:</p>
                <p className="pl-4">for each group G in P:</p>
                <p className="pl-8">for each symbol a:</p>
                <p className="pl-12">split G if states in G go to different partitions on a</p>
                <p><span className="text-primary">3.</span> until no more splits</p>
                <p><span className="text-primary">4.</span> each partition = one minimized state</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Partition refinement for (a|b)*abb</p>
              <SVGPartition />
              <p className="text-xs text-center text-muted-foreground mt-2">D1 and D2 are equivalent → merged into M1. Dead state removed.</p>
            </div>
            <p>
              The minimized DFA is <KW>unique up to isomorphism</KW> — any two minimal DFAs for the same language are isomorphic (same structure, just different state names). This is the <em>Myhill-Nerode theorem</em>.
            </p>
            <p>
              For <Code>(a|b)*abb</Code>: 5-state DFA → <KW>4-state minimal DFA</KW> (the dead/trap state is removed since it&apos;s unreachable after minimization removes it as a non-distinguishable partition).
            </p>
          </div>
        </Section>

        {/* ── 7. Comparison table ────────────────────────────────────────── */}
        <Section id="compare" badge="⑦" title="NFA vs DFA vs Minimized DFA" subtitle="Side-by-side comparison of all three representations">
          <ComparisonTable />
        </Section>

        {/* ── 8. Applications ────────────────────────────────────────────── */}
        <Section id="apps" badge="⑧" title="Applications" subtitle="Where finite automata appear in the real world">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DYK.map(({ icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-background p-4 space-y-2 hover:border-primary/40 transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="font-bold text-sm text-foreground">{title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 9. Quiz ────────────────────────────────────────────────────── */}
        <Section id="quiz" badge="⑨" title="Quick Quiz" subtitle="Test your understanding">
          <Quiz />
        </Section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="pt-6">
          {/* Divider */}
          <div className="border-t border-border/40 mb-10" />

          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-purple-500/5 p-10 text-center space-y-5">
            <h2 className="text-2xl font-black text-foreground">
              Now that you understand the theory, build your own automaton.
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Enter any regular expression and watch Thompson&apos;s construction, subset construction,
              and Hopcroft minimization happen live — with interactive graphs.
            </p>
            <div className="pt-2">
              <SimulatorCTA size="lg" label="Try the Live Simulator →" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/50 py-6 text-center text-xs text-muted-foreground">
        <p>RegexFA · Regular Expression → Finite Automata · Theory based on Hopcroft, Motwani &amp; Ullman, <em>Introduction to Automata Theory</em></p>
        <button onClick={scrollToTop} className="mt-2 text-primary hover:underline">↑ Back to top</button>
      </footer>
    </div>
  );
}
