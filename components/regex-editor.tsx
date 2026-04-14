'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Play, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateRegex } from '@/lib/thompson';

interface RegexEditorProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  onConvertDFA: () => void;
  onReset: () => void;
  hasNFA: boolean;
}

export function RegexEditor({
  value,
  onChange,
  onGenerate,
  onConvertDFA,
  onReset,
  hasNFA,
}: RegexEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value) {
      const validation = validateRegex(value);
      if (!validation.valid) {
        setError(validation.error || 'Invalid regex');
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!error && value) {
          onGenerate();
        }
      }
    },
    [error, value, onGenerate]
  );

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {/* Header */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-1">Input</h2>
        <p className="text-xs text-muted-foreground">
          Enter a regular expression to convert
        </p>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div
          className={`
            relative rounded-lg border-2 transition-colors duration-200 bg-background/50
            ${isFocused ? 'border-primary' : 'border-border'}
            ${error ? 'border-destructive' : ''}
          `}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Enter regular expression..."
            className="w-full px-4 py-3 bg-transparent font-mono text-base focus:outline-none text-foreground placeholder:text-muted-foreground"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Syntax Reference */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Supported Syntax
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <code className="font-mono text-primary">a, b, c</code>
            <span className="text-muted-foreground">Characters</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <code className="font-mono text-primary">|</code>
            <span className="text-muted-foreground">Union</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <code className="font-mono text-primary">*</code>
            <span className="text-muted-foreground">Kleene star</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <code className="font-mono text-primary">+</code>
            <span className="text-muted-foreground">One or more</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <code className="font-mono text-primary">?</code>
            <span className="text-muted-foreground">Optional</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary/30">
            <code className="font-mono text-primary">()</code>
            <span className="text-muted-foreground">Grouping</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        <Button
          onClick={onGenerate}
          disabled={!!error || !value}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Play className="h-4 w-4 mr-2" />
          Generate Automaton
        </Button>

        <Button
          onClick={onConvertDFA}
          disabled={!hasNFA}
          variant="outline"
          className="w-full border-border text-foreground hover:bg-secondary/50"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Convert to DFA
        </Button>

        <Button
          onClick={onReset}
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Keyboard Shortcut */}
      <div className="text-xs text-muted-foreground text-center">
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Ctrl</kbd>
        {' + '}
        <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs">Enter</kbd>
        {' to generate'}
      </div>
    </div>
  );
}
