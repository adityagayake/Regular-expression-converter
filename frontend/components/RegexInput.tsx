"use client";

interface RegexInputProps {
  regex: string;
  loading: boolean;
  error: string | null;
  onRegexChange: (value: string) => void;
}

const EXAMPLES = [
  { label: "(a|b)*abb", value: "(a|b)*abb" },
  { label: "a*b*",      value: "a*b*" },
  { label: "(ab)+",     value: "(ab)+" },
  { label: "a(b|c)*",   value: "a(b|c)*" },
  { label: "a?b",       value: "a?b" },
  { label: "(a|b)*",    value: "(a|b)*" },
];

export function RegexInput({ regex, loading, error, onRegexChange }: RegexInputProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Regex → Automata</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Thompson&apos;s construction</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Regular Expression
          </label>
          <div className="relative">
            <input
              value={regex}
              onChange={(e) => onRegexChange(e.target.value)}
              placeholder="e.g. (a|b)*abb"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground transition-colors"
            />
            {loading && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                …
              </span>
            )}
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5">
              {error}
            </p>
          )}
        </div>

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Examples</p>
          <div className="grid grid-cols-2 gap-1.5">
            {EXAMPLES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onRegexChange(value)}
                className={`rounded-md border px-2 py-1.5 text-xs font-mono text-left transition-all hover:border-primary/60 hover:text-primary ${
                  regex === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Syntax guide */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Syntax</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            {[
              ["a", "literal symbol"],
              ["AB", "concatenation"],
              ["A|B", "union (alternation)"],
              ["A*", "Kleene star (0 or more)"],
              ["A+", "one or more"],
              ["A?", "zero or one"],
              ["(A)", "grouping"],
            ].map(([op, desc]) => (
              <div key={op} className="flex gap-2">
                <code className="w-10 shrink-0 font-mono text-primary">{op}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
