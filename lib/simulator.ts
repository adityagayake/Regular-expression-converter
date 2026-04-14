import type { NFA, NFAState } from './thompson';
import { epsilonClosure, move } from './dfa';

export interface SimulationStep {
  position: number;
  symbol: string | null;
  currentStates: number[];
  description: string;
  isAccepting: boolean;
}

export interface SimulationResult {
  accepted: boolean;
  steps: SimulationStep[];
  inputString: string;
}

export function simulateNFA(nfa: NFA, input: string): SimulationResult {
  const stateById = new Map<number, NFAState>();
  for (const state of nfa.states) {
    stateById.set(state.id, state);
  }

  const toStateSet = (ids: Set<number>): Set<NFAState> =>
    new Set([...ids].map((id) => stateById.get(id) ?? { id, isStart: false, isAccept: false }));

  const toIdSet = (states: Set<NFAState>): Set<number> => new Set([...states].map((s) => s.id));
  const steps: SimulationStep[] = [];
  let currentStates = epsilonClosure(toStateSet(new Set([nfa.startState])), nfa.transitions);
  let currentIds = toIdSet(currentStates);

  steps.push({
    position: -1,
    symbol: null,
    currentStates: [...currentIds].sort((a, b) => a - b),
    description: `Initial: ε-closure(start) = {${[...currentIds].sort((a, b) => a - b).join(', ')}}`,
    isAccepting: currentIds.has(nfa.acceptState),
  });

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const moved = move(currentStates, symbol, nfa.transitions);
    currentStates = epsilonClosure(moved, nfa.transitions);
    currentIds = toIdSet(currentStates);
    const ordered = [...currentIds].sort((a, b) => a - b);

    steps.push({
      position: i,
      symbol,
      currentStates: ordered,
      description: currentIds.size > 0
        ? `After '${symbol}': move + ε-closure = {${ordered.join(', ')}}`
        : `After '${symbol}': No valid states (stuck)`,
      isAccepting: currentIds.has(nfa.acceptState),
    });

    if (currentIds.size === 0) {
      return {
        accepted: false,
        steps,
        inputString: input,
      };
    }
  }

  return {
    accepted: currentIds.has(nfa.acceptState),
    steps,
    inputString: input,
  };
}
