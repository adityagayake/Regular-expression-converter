"use client";

import { useEffect, useRef, useState } from "react";
import type { SimulationResult } from "@/lib/automata";

interface SimulationPanelProps {
  simulation: SimulationResult | null;
  onSimulate: (input: string) => void;
  onActiveStepChange?: (step: number) => void;
  regex: string;
  mode: "nfa" | "dfa";
}

export function SimulationPanel({ 
  simulation, 
  onSimulate, 
  onActiveStepChange, 
  regex, 
  mode 
}: SimulationPanelProps) {
  const [input, setInput] = useState("");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const traceEndRef = useRef<HTMLDivElement>(null);

  // Reset step when simulation changes
  useEffect(() => {
    setActiveStep(0);
    setIsPlaying(false);
  }, [simulation]);

  // Auto-scroll to active step
  useEffect(() => {
    if (activeStep >= 0) {
      traceEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeStep]);

  // Notify parent of active step
  useEffect(() => {
    if (onActiveStepChange !== undefined) {
      onActiveStepChange(activeStep);
    }
  }, [activeStep, onActiveStepChange]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !simulation) return;
    const maxStep = simulation.steps.length - 1;
    if (activeStep >= maxStep) {
      setIsPlaying(false);
      return;
    }
    playRef.current = setTimeout(() => {
      setActiveStep((s) => s + 1);
    }, 700);
    return () => { 
      if (playRef.current) clearTimeout(playRef.current); 
    };
  }, [isPlaying, activeStep, simulation]);

  const handleSimulate = () => {
    if (!regex.trim()) return;
    onSimulate(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSimulate();
  };

  const stepForward = () => {
    if (!simulation) return;
    setActiveStep((s) => Math.min(s + 1, simulation.steps.length - 1));
  };

  const stepBack = () => {
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  const reset = () => {
    setActiveStep(0);
    setIsPlaying(false);
  };

  const play = () => {
    if (!simulation) return;
    if (activeStep >= simulation.steps.length - 1) setActiveStep(0);
    setIsPlaying(true);
  };

  const pause = () => setIsPlaying(false);

  const currentStep = simulation && activeStep >= 0 ? simulation.steps[activeStep] : null;
  const maxStep = simulation ? simulation.steps.length - 1 : 0;

  // Generate explanation
  const getExplanation = (): string => {
    if (!simulation) return "";
    if (simulation.accepted) {
      const finalStates = simulation.steps[simulation.steps.length - 1].currentStates;
      if (mode === "nfa") {
        return `Accepted: final states {${(finalStates as number[]).map(id => `q${id}`).join(", ")}} include an accepting state.`;
      } else {
        return `Accepted: final state ${finalStates[0]} is an accepting state.`;
      }
    } else {
      const finalStates = simulation.steps[simulation.steps.length - 1].currentStates;
      if (finalStates.length === 0) {
        return "Rejected: no valid transitions available (dead state).";
      } else {
        if (mode === "nfa") {
          return `Rejected: final states {${(finalStates as number[]).map(id => `q${id}`).join(", ")}} do not include any accepting state.`;
        } else {
          return `Rejected: final state ${finalStates[0]} is not an accepting state.`;
        }
      }
    }
  };

  return (
    <div className="border-t border-border bg-card">
      {/* Input row */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter string to simulate…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>
          <button
            onClick={handleSimulate}
            disabled={!regex.trim()}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:scale-105 disabled:opacity-40 disabled:scale-100"
          >
            Run
          </button>
        </div>
      </div>

      {/* Simulation results */}
      {simulation && (
        <div className="px-4 pb-3 space-y-3">
          {/* Result badge + explanation */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide transition-all ${
                  simulation.accepted
                    ? "bg-green-900/60 text-green-300 border border-green-600 shadow-lg shadow-green-900/30"
                    : "bg-red-900/60 text-red-300 border border-red-600 shadow-lg shadow-red-900/30"
                }`}
              >
                {simulation.accepted ? "✔ ACCEPTED" : "✖ REJECTED"}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                &quot;{simulation.inputString}&quot; · {mode.toUpperCase()}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
              {getExplanation()}
            </div>
          </div>

          {/* Timeline slider */}
          {simulation.steps.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Timeline</span>
                <span className="font-mono">
                  Step {activeStep + 1} / {simulation.steps.length}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={simulation.steps.length - 1}
                value={activeStep}
                onChange={(e) => {
                  setActiveStep(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    ${simulation.accepted ? '#00e5ff' : '#ff5252'} 0%, 
                    ${simulation.accepted ? '#00e5ff' : '#ff5252'} ${(activeStep / maxStep) * 100}%, 
                    #1e3a5f ${(activeStep / maxStep) * 100}%, 
                    #1e3a5f 100%)`,
                }}
              />
            </div>
          )}

          {/* Step controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              title="Reset to start"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-border hover:bg-secondary hover:border-primary/50 transition-all"
            >
              ↺ Reset
            </button>
            <button
              onClick={stepBack}
              disabled={activeStep <= 0}
              title="Step back"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-border hover:bg-secondary hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ⏮ Back
            </button>
            {isPlaying ? (
              <button
                onClick={pause}
                title="Pause"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold border-2 border-primary text-primary hover:bg-primary/10 transition-all"
              >
                ⏸ Pause
              </button>
            ) : (
              <button
                onClick={play}
                title="Play"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold border-2 border-primary text-primary hover:bg-primary/10 transition-all"
              >
                ▶ Play
              </button>
            )}
            <button
              onClick={stepForward}
              disabled={activeStep >= maxStep}
              title="Step forward"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-border hover:bg-secondary hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next ⏭
            </button>
          </div>

          {/* Current step highlight */}
          {currentStep && (
            <div 
              className="rounded-lg border-2 border-primary/60 bg-primary/10 px-3 py-2.5 text-xs font-mono transition-all"
              style={{
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary font-bold">
                  {currentStep.position === -1 ? "START" : `READ '${currentStep.symbol}'`}
                </span>
                {currentStep.isAccepting && (
                  <span className="text-green-400 text-xs">✔ Accepting</span>
                )}
              </div>
              <div className="text-foreground">
                {currentStep.description}
              </div>
            </div>
          )}

          {/* Complete execution trace */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Execution Trace
            </div>
            <div 
              className="max-h-40 overflow-y-auto space-y-1 pr-1" 
              style={{ 
                scrollbarWidth: "thin", 
                scrollbarColor: "#4fc3f7 #0d1f3c" 
              }}
            >
              {simulation.steps.map((step, idx) => {
                const isActive = idx === activeStep;
                const isPast = idx < activeStep;
                const label = step.position === -1 ? "Start" : `Read '${step.symbol}'`;
                const stateStr =
                  mode === "nfa"
                    ? `{${(step.currentStates as number[]).map((id) => `q${id}`).join(", ")}}`
                    : step.currentStates.length > 0
                      ? String(step.currentStates[0])
                      : "∅";
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveStep(idx);
                      setIsPlaying(false);
                    }}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                      isActive
                        ? "border-primary bg-primary/15 text-primary shadow-lg shadow-primary/20 scale-[1.02]"
                        : isPast
                          ? "border-border/50 bg-card/50 text-muted-foreground/70 hover:border-primary/30"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isActive ? "text-primary" : ""}`}>
                          {label}
                        </span>
                        <span className="font-mono text-[11px]">→</span>
                        <span className="font-mono">{stateStr}</span>
                      </div>
                      {step.isAccepting && (
                        <span className="text-green-400 text-[10px]">✔</span>
                      )}
                    </div>
                  </button>
                );
              })}
              <div ref={traceEndRef} />
            </div>
          </div>
        </div>
      )}

      {!simulation && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">
            Enter a string and click <span className="font-semibold text-primary">Run</span> to simulate execution.
          </p>
        </div>
      )}
    </div>
  );
}
