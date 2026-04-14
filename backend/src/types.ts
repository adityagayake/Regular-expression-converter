// types.ts - Shared type definitions for the automata backend

export interface State {
  id: string;
  transitions: Map<string, Set<string>>; // symbol -> set of state IDs
  epsilonTransitions: Set<string>; // epsilon transitions to other state IDs
}

export interface Automaton {
  states: State[];
  start: string; // start state ID
  accept: string[]; // accept state IDs
}

export interface Transition {
  from: string;
  to: string;
  symbol: string;
}

export interface AutomatonOutput {
  states: string[];
  start: string;
  accept: string[];
  transitions: Transition[];
}

export interface SimulationResult {
  accepted: boolean;
  trace: string[]; // list of state sets or states at each step
}

export interface Fragment {
  start: string;
  accept: string;
  states: State[];
}

export interface ConstructionStep {
  stepNumber: number;
  type: string;
  description: string;
  fragmentStates: string[];
}