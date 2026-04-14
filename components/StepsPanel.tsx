"use client";

import type { ConstructionStep } from "@/lib/automata";

interface StepsPanelProps {
  steps?: ConstructionStep[];
}

const OP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  symbol:   { bg: "bg-blue-900/40",   text: "text-blue-300",   border: "border-blue-700" },
  concat:   { bg: "bg-purple-900/40", text: "text-purple-300", border: "border-purple-700" },
  union:    { bg: "bg-cyan-900/40",   text: "text-cyan-300",   border: "border-cyan-700" },
  star:     { bg: "bg-yellow-900/40", text: "text-yellow-300", border: "border-yellow-700" },
  plus:     { bg: "bg-orange-900/40", text: "text-orange-300", border: "border-orange-700" },
  optional: { bg: "bg-green-900/40",  text: "text-green-300",  border: "border-green-700" },
};

const OP_LABELS: Record<string, string> = {
  symbol: "Symbol",
  concat: "Concat",
  union: "Union",
  star: "Star *",
  plus: "Plus +",
  optional: "Optional ?",
};

export function StepsPanel({ steps }: StepsPanelProps) {
  const safeSteps = steps ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Construction Steps</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Thompson&apos;s NFA construction</p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#4fc3f7 #0d1f3c" }}
      >
        {safeSteps.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">Enter a regex to see construction steps.</p>
        )}

        {safeSteps.map((step) => {
          const opKey = step.type ?? step.operation ?? "symbol";
          const colors = OP_COLORS[opKey] ?? OP_COLORS.symbol;
          const label = OP_LABELS[opKey] ?? opKey;

          return (
            <div
              key={step.stepNumber}
              className={`rounded-md border ${colors.border} ${colors.bg} p-3 transition-all`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-muted-foreground">#{step.stepNumber}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colors.text} border ${colors.border}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{step.description}</p>
              {step.fragmentStates.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                  States: {step.fragmentStates.map((id) => `q${id}`).join(", ")}
                </p>
              )}
              {step.newEdges.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  New edges: {step.newEdges.map((e) => `q${e.from}→q${e.to}(${e.symbol})`).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
