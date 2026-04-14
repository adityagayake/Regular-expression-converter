"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraphView, type GraphMode } from "@/components/GraphView";
import { RegexInput } from "@/components/RegexInput";
import { StepsPanel } from "@/components/StepsPanel";
import { useAppStore } from "@/lib/store";
import type { ProcessRegexResult } from "@/lib/automata";
import type { MinDFA } from "@/lib/minimize";

export default function Page() {
  const { regex, nfa, dfa, minDfa, steps, setRegex, setData, clear } = useAppStore();
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode]     = useState<GraphMode>("nfa");
  const [mounted, setMounted] = useState(false);

  // Fade in on mount
  useEffect(() => { setMounted(true); }, []);

  // Debounced conversion
  useEffect(() => {
    if (!regex.trim()) {
      clear();
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const res  = await fetch("/api/convert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ regex }),
          });
          const data = (await res.json()) as ProcessRegexResult & { minDfa?: MinDFA; error?: string };
          if (!res.ok || data.error) throw new Error(data.error ?? "Failed to convert regex");
          setData({
            nfa:    data.nfa,
            dfa:    data.dfa,
            minDfa: data.minDfa ?? undefined,
            steps:  Array.isArray(data.steps) ? data.steps : [],
            simulation: null,
          });
        } catch (e) {
          clear();
          setError((e as Error).message);
        } finally {
          setLoading(false);
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [regex, clear, setData]);

  const canRender = Boolean(nfa);

  const MODES: { id: GraphMode; label: string; desc: string }[] = [
    { id: "nfa", label: "NFA",         desc: "ε-NFA (Thompson)" },
    { id: "dfa", label: "DFA",         desc: "Subset construction" },
    { id: "min", label: "Min DFA",     desc: "Hopcroft minimization" },
  ];

  return (
    <div
      className="h-screen w-full overflow-hidden bg-background text-foreground flex flex-col transition-opacity duration-300"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-border px-5 py-2.5 shrink-0 bg-card/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-white">FA</span>
          </div>
          <span className="text-sm font-bold tracking-wide">RegexFA</span>
          <span className="text-xs text-muted-foreground hidden md:block">
            Regular Expression → Finite Automata
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground border border-border hover:border-primary/50 hover:text-primary transition-all"
          >
            ← Theory
          </Link>
          <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                title={MODES.find(m => m.id === id)?.desc}
                className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
                  mode === id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — regex input */}
        <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          <RegexInput
            regex={regex}
            loading={loading}
            error={error}
            onRegexChange={setRegex}
          />
        </aside>

        {/* Center — graph */}
        <main className="flex flex-1 flex-col overflow-hidden relative">
          {canRender ? (
            <GraphView nfa={nfa} dfa={dfa} minDfa={minDfa} mode={mode} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="animate-pulse text-xs">Building automata…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-8">
                  <span className="text-2xl">∅</span>
                  <span className="text-sm">Enter a regex to generate automata</span>
                  <span className="text-xs text-muted-foreground/60">Supports: a b | * + ? ( )</span>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          {canRender && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full border border-border bg-card/90 backdrop-blur px-5 py-1.5 text-[11px] text-muted-foreground pointer-events-none shadow-lg">
              {[
                { bg: "#2d1b69", border: "#7c4dff", label: "Start" },
                { bg: "#0d2f3f", border: "#00e5ff", label: "Accept ◎" },
                { bg: "#1e3a5f", border: "#4fc3f7", label: "Normal" },
              ].map(({ bg, border, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full border-2" style={{ background: bg, borderColor: border }} />
                  <span>{label}</span>
                </span>
              ))}
              {mode === "min" && minDfa && (
                <span className="text-primary font-semibold">
                  {minDfa.states.length} states
                </span>
              )}
            </div>
          )}

          {/* Min DFA mapping tooltip */}
          {canRender && mode === "min" && minDfa && (
            <div className="absolute top-3 right-3 rounded-lg border border-border bg-card/95 backdrop-blur px-3 py-2 text-[11px] text-muted-foreground shadow-lg max-w-48">
              <div className="font-semibold text-foreground mb-1.5">Partition mapping</div>
              {Object.entries(minDfa.mapping).map(([mid, orig]) => (
                <div key={mid} className="font-mono">
                  <span className="text-primary">{mid}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span>{`{${orig.join(", ")}}`}</span>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right — construction steps */}
        <aside className="w-72 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <StepsPanel steps={steps} />
        </aside>
      </div>
    </div>
  );
}
