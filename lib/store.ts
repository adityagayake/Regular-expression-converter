"use client";

import { create } from "zustand";
import type { ConstructionStep, DFA, NFA, SimulationResult } from "./automata";
import type { MinDFA } from "./minimize";

interface AppStore {
  regex: string;
  nfa: NFA | null;
  dfa: DFA | null;
  minDfa: MinDFA | null;
  steps: ConstructionStep[];
  simulation: SimulationResult | null;
  setRegex: (regex: string) => void;
  setData: (payload: Partial<{
    nfa: NFA;
    dfa: DFA;
    minDfa: MinDFA;
    steps: ConstructionStep[];
    simulation: SimulationResult | null;
  }>) => void;
  clear: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  regex: "",
  nfa: null,
  dfa: null,
  minDfa: null,
  steps: [],
  simulation: null,
  setRegex: (regex) => set({ regex }),
  setData: (payload) => set((state) => ({ ...state, ...payload })),
  clear: () => set({ nfa: null, dfa: null, minDfa: null, steps: [], simulation: null }),
}));
