'use client';

import { motion } from 'framer-motion';
import { RotateCcw, Layers, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export type AppStatus = 'idle' | 'building' | 'simulating' | 'converting';

interface NavbarProps {
  onReset: () => void;
  isStepMode: boolean;
  onStepModeChange: (value: boolean) => void;
  showDFA: boolean;
  onShowDFAChange: (value: boolean) => void;
  hasDFA: boolean;
  status: AppStatus;
}

const statusConfig: Record<AppStatus, { label: string; color: string }> = {
  idle: { label: 'Ready', color: 'bg-state-start' },
  building: { label: 'Building...', color: 'bg-state-active' },
  simulating: { label: 'Simulating...', color: 'bg-epsilon' },
  converting: { label: 'Converting...', color: 'bg-warning' },
};

export function Navbar({ 
  onReset,
  isStepMode,
  onStepModeChange,
  showDFA,
  onShowDFAChange,
  hasDFA,
  status 
}: NavbarProps) {
  const statusInfo = statusConfig[status];

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Title */}
      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">
            Regular Expression Converter
          </h1>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/50 text-sm">
          <motion.div
            className={`w-2 h-2 rounded-full ${statusInfo.color}`}
            animate={status !== 'idle' ? { 
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1] 
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-muted-foreground text-xs">{statusInfo.label}</span>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* Reset Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>

        {/* Step Mode Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Step Mode</label>
          <Switch
            checked={isStepMode}
            onCheckedChange={onStepModeChange}
          />
        </div>

        {/* Show DFA Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            Show DFA
          </label>
          <Switch
            checked={showDFA}
            onCheckedChange={onShowDFAChange}
            disabled={!hasDFA}
          />
        </div>
      </div>
    </header>
  );
}
