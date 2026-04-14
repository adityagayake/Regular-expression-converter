import type { NFA, NFAState, NFATransition } from './thompson';

export interface DFAState {
  id: string;
  nfaStates: Set<number>;
  isStart: boolean;
  isAccept: boolean;
}

export interface DFATransition {
  from: string;
  to: string;
  symbol: string;
}

export interface DFA {
  states: DFAState[];
  transitions: DFATransition[];
  startState: string;
  acceptStates: string[];
  alphabet: Set<string>;
}

export interface DFAConversionStep {
  description: string;
  currentStateSet: number[];
  symbol?: string;
  resultStateSet?: number[];
  newState?: string;
  newTransition?: DFATransition;
  dfa: DFA;
}

function normalizeStateSet(states: Set<number>): number[] {
  return [...states].sort((a, b) => a - b);
}

function stateSetToId(states: Set<number>): string {
  return `{${normalizeStateSet(states).join(',')}}`;
}

function toIdSet(states: Set<NFAState>): Set<number> {
  return new Set([...states].map((s) => s.id));
}

function transitionsFrom(stateId: number, transitions: NFATransition[]): NFATransition[] {
  return transitions.filter((t) => t.from === stateId);
}

export function epsilonClosure(states: Set<NFAState>, transitions: NFATransition[]): Set<NFAState> {
  const stateMap = new Map<number, NFAState>();
  for (const s of states) {
    stateMap.set(s.id, s);
  }

  const queue = [...states];
  while (queue.length > 0) {
    const current = queue.shift() as NFAState;
    for (const edge of transitionsFrom(current.id, transitions)) {
      if (edge.symbol !== 'ε' || stateMap.has(edge.to)) {
        continue;
      }
      const discovered: NFAState = { id: edge.to, isStart: false, isAccept: false };
      stateMap.set(discovered.id, discovered);
      queue.push(discovered);
    }
  }
  return new Set([...stateMap.values()]);
}

export function move(states: Set<NFAState>, symbol: string, transitions: NFATransition[]): Set<NFAState> {
  const result = new Map<number, NFAState>();
  for (const state of states) {
    for (const edge of transitionsFrom(state.id, transitions)) {
      if (edge.symbol === symbol) {
        result.set(edge.to, { id: edge.to, isStart: false, isAccept: false });
      }
    }
  }
  return new Set([...result.values()]);
}

function snapshotDFA(
  stateMap: Map<string, DFAState>,
  transitions: DFATransition[],
  startState: string,
  alphabet: Set<string>
): DFA {
  const states = [...stateMap.values()].map((s) => ({
    ...s,
    nfaStates: new Set(s.nfaStates),
  }));

  return {
    states,
    transitions: transitions.map((t) => ({ ...t })),
    startState,
    acceptStates: states.filter((s) => s.isAccept).map((s) => s.id),
    alphabet: new Set(alphabet),
  };
}

export function convertToDFA(nfa: NFA): { dfa: DFA; steps: DFAConversionStep[] } {
  const idToState = new Map<number, NFAState>();
  for (const state of nfa.states) {
    idToState.set(state.id, state);
  }

  const symbols = [...nfa.alphabet].filter((s) => s !== 'ε').sort();
  const steps: DFAConversionStep[] = [];
  const dfaStates = new Map<string, DFAState>();
  const dfaTransitions: DFATransition[] = [];
  const queue: string[] = [];

  const startNFA = idToState.get(nfa.startState);
  if (!startNFA) {
    throw new Error('Invalid NFA: start state missing');
  }

  const startClosure = epsilonClosure(new Set([startNFA]), nfa.transitions);
  const startClosureIds = toIdSet(startClosure);
  const startId = stateSetToId(startClosureIds);
  const startDFAState: DFAState = {
    id: startId,
    nfaStates: startClosureIds,
    isStart: true,
    isAccept: startClosureIds.has(nfa.acceptState),
  };
  dfaStates.set(startId, startDFAState);
  queue.push(startId);

  steps.push({
    description: `Initial DFA state is ε-closure({${nfa.startState}}) = ${startId}`,
    currentStateSet: normalizeStateSet(startClosureIds),
    dfa: snapshotDFA(dfaStates, dfaTransitions, startId, new Set(symbols)),
  });

  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    const current = dfaStates.get(currentId) as DFAState;
    const currentConcreteStates = new Set(
      [...current.nfaStates].map((id) => idToState.get(id) ?? { id, isStart: false, isAccept: false })
    );

    for (const symbol of symbols) {
      const moved = move(currentConcreteStates, symbol, nfa.transitions);
      if (moved.size === 0) {
        continue;
      }
      const closure = epsilonClosure(moved, nfa.transitions);
      const closureIds = toIdSet(closure);
      const closureId = stateSetToId(closureIds);

      if (!dfaStates.has(closureId)) {
        const newState: DFAState = {
          id: closureId,
          nfaStates: closureIds,
          isStart: false,
          isAccept: closureIds.has(nfa.acceptState),
        };
        dfaStates.set(closureId, newState);
        queue.push(closureId);
        steps.push({
          description: `Discovered DFA state ${closureId} from δ(${currentId}, '${symbol}')`,
          currentStateSet: normalizeStateSet(current.nfaStates),
          symbol,
          resultStateSet: normalizeStateSet(closureIds),
          newState: closureId,
          dfa: snapshotDFA(dfaStates, dfaTransitions, startId, new Set(symbols)),
        });
      }

      const transition: DFATransition = { from: currentId, to: closureId, symbol };
      if (!dfaTransitions.some((t) => t.from === transition.from && t.to === transition.to && t.symbol === transition.symbol)) {
        dfaTransitions.push(transition);
      }
      steps.push({
        description: `Added transition ${currentId} --'${symbol}'--> ${closureId}`,
        currentStateSet: normalizeStateSet(current.nfaStates),
        symbol,
        resultStateSet: normalizeStateSet(closureIds),
        newTransition: transition,
        dfa: snapshotDFA(dfaStates, dfaTransitions, startId, new Set(symbols)),
      });
    }
  }

  const dfa = snapshotDFA(dfaStates, dfaTransitions, startId, new Set(symbols));
  return { dfa, steps };
}

export function simulateDFA(dfa: DFA, input: string): {
  accepted: boolean;
  steps: { position: number; symbol: string | null; state: string; isAccepting: boolean }[];
} {
  const steps: { position: number; symbol: string | null; state: string; isAccepting: boolean }[] = [];
  let current = dfa.startState;
  const accepting = new Set(dfa.acceptStates);
  steps.push({ position: -1, symbol: null, state: current, isAccepting: accepting.has(current) });

  for (let i = 0; i < input.length; i += 1) {
    const symbol = input[i];
    const edge = dfa.transitions.find((t) => t.from === current && t.symbol === symbol);
    if (!edge) {
      return { accepted: false, steps };
    }
    current = edge.to;
    steps.push({ position: i, symbol, state: current, isAccepting: accepting.has(current) });
  }

  return { accepted: accepting.has(current), steps };
}
