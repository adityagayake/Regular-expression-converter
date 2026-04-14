'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Layers, 
  GitBranch, 
  Repeat, 
  CircleDot, 
  Plus, 
  HelpCircle,
  Activity
} from 'lucide-react';
import type { ConstructionStep } from '@/lib/thompson';
import type { DFAConversionStep } from '@/lib/dfa';
import type { SimulationStep } from '@/lib/simulator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExplanationPanelProps {
  steps: ConstructionStep[];
  dfaSteps?: DFAConversionStep[];
  simulationSteps?: SimulationStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  mode: 'construction' | 'dfa' | 'simulation';
}

const stepIcons: Record<ConstructionStep['type'], React.ReactNode> = {
  symbol: <CircleDot className="h-4 w-4" />,
  concat: <Layers className="h-4 w-4" />,
  union: <GitBranch className="h-4 w-4" />,
  star: <Repeat className="h-4 w-4" />,
  plus: <Plus className="h-4 w-4" />,
  optional: <HelpCircle className="h-4 w-4" />,
};

const stepTypeLabels: Record<ConstructionStep['type'], string> = {
  symbol: 'Symbol',
  concat: 'Concatenation',
  union: 'Union (|)',
  star: 'Kleene Star (*)',
  plus: 'Plus (+)',
  optional: 'Optional (?)',
};

export function ExplanationPanel({
  steps,
  dfaSteps = [],
  simulationSteps = [],
  currentStep,
  onStepClick,
  mode,
}: ExplanationPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground">
          {mode === 'simulation' 
            ? 'Simulation Steps' 
            : mode === 'dfa' 
              ? 'DFA Conversion' 
              : 'Thompson Construction Steps'
          }
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'simulation' 
            ? 'Click a step to see the active states' 
            : 'Click a step to see the automaton at that point'
          }
        </p>
      </div>

      {/* Steps List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {mode === 'simulation' && simulationSteps.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {simulationSteps.map((step, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onStepClick?.(idx)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${idx === currentStep 
                      ? 'bg-state-active/10 border-state-active' 
                      : 'bg-card/50 border-border hover:border-muted-foreground'
                    }
                    ${idx < currentStep ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-1.5 py-0.5 bg-secondary rounded">
                      {step.position === -1 ? 'Start' : `Pos ${step.position}`}
                    </span>
                    {step.symbol && (
                      <span className="text-xs font-mono text-warning">
                        {`'${step.symbol}'`}
                      </span>
                    )}
                    {step.isAccepting && (
                      <span className="text-xs text-success ml-auto flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Accepting
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <div className="mt-2 text-xs font-mono text-state-active">
                    States: {`{${step.currentStates.join(', ')}}`}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          ) : mode === 'dfa' && dfaSteps.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {dfaSteps.map((step, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onStepClick?.(idx)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${idx === currentStep 
                      ? 'bg-epsilon/10 border-epsilon' 
                      : 'bg-card/50 border-border hover:border-muted-foreground'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ChevronRight className="h-4 w-4 text-epsilon" />
                    <span className="text-sm font-medium text-foreground">Step {idx + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.newState && (
                    <div className="mt-2 text-xs font-mono text-success">
                      New state: {step.newState}
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          ) : steps.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {steps.map((step, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onStepClick?.(idx)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-colors
                    ${idx === currentStep 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-card/50 border-border hover:border-muted-foreground'
                    }
                    ${idx < currentStep ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono px-1.5 py-0.5 bg-secondary rounded">
                      {idx + 1}
                    </span>
                    <span className="text-primary">{stepIcons[step.type]}</span>
                    <span className="text-sm font-medium text-foreground">
                      {stepTypeLabels[step.type]}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-primary mb-2">
                    {step.regex}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>States: {step.nfa.states.length}</span>
                    <span>Transitions: {step.nfa.transitions.length}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="text-center text-muted-foreground">
                <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Enter a regex and generate</p>
                <p className="text-xs mt-1">to see construction steps</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t border-border">
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Visual Guide</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#81C784' }} />
            <span className="text-muted-foreground">Start</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#D2C1B6' }} />
            <span className="text-muted-foreground">Accept</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 border-t-2 border-dashed" style={{ borderColor: '#BA68C8' }} />
            <span className="text-muted-foreground">Epsilon</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 pulse-active" style={{ borderColor: '#64B5F6' }} />
            <span className="text-muted-foreground">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
