import { convertToDFA, type DFA } from './dfa';
import { simulateNFA, type SimulationResult } from './simulator';

export interface NFAState {
  id: number;
  isStart: boolean;
  isAccept: boolean;
}

export interface NFATransition {
  from: number;
  to: number;
  symbol: string;
}

export interface NFA {
  states: NFAState[];
  transitions: NFATransition[];
  startState: number;
  acceptState: number;
  alphabet: Set<string>;
}

type CoreOperation = 'symbol' | 'concat' | 'union' | 'star';
export interface Step {
  stepNumber: number;
  operation: CoreOperation;
  description: string;
  fragmentStates: number[];
  fragmentTransitions: NFATransition[];
}

export interface ConstructionStep extends Step {
  type: CoreOperation | 'plus' | 'optional';
  regex: string;
  nfa: NFA;
  highlightStates?: number[];
  highlightTransitions?: number[];
}

export interface FlowNode {
  id: string;
  data: {
    label: string;
    isStart: boolean;
    isAccept: boolean;
    nfaStates?: number[];
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface ProcessRegexResult {
  nfa: { nodes: FlowNode[]; edges: FlowEdge[] };
  steps: ConstructionStep[];
  dfa: { nodes: FlowNode[]; edges: FlowEdge[] };
  simulation: SimulationResult | null;
  raw: {
    explicitRegex: string;
    postfix: string;
    nfa: NFA;
    dfa: DFA;
  };
  error?: string;
}

interface Fragment {
  states: NFAState[];
  transitions: NFATransition[];
  startState: number;
  acceptState: number;
  alphabet: Set<string>;
}

let stateCounter = 0;

function resetStateCounter(): void {
  stateCounter = 0;
}

function isOperator(ch: string): boolean {
  return ch === '|' || ch === '.' || ch === '*' || ch === '+' || ch === '?';
}

function isSymbolChar(ch: string): boolean {
  return ch.length === 1 && !isOperator(ch) && ch !== '(' && ch !== ')';
}

function createState(isStart = false, isAccept = false): NFAState {
  return { id: stateCounter++, isStart, isAccept };
}

function cloneNFA(nfa: NFA): NFA {
  return {
    states: nfa.states.map((s) => ({ ...s })),
    transitions: nfa.transitions.map((t) => ({ ...t })),
    startState: nfa.startState,
    acceptState: nfa.acceptState,
    alphabet: new Set(nfa.alphabet),
  };
}

function makeNFAFromFragment(fragment: Fragment): NFA {
  const uniqueStates = new Map<number, NFAState>();
  for (const s of fragment.states) {
    uniqueStates.set(s.id, {
      ...s,
      isStart: s.id === fragment.startState,
      isAccept: s.id === fragment.acceptState,
    });
  }

  const uniqueTransitions = new Map<string, NFATransition>();
  for (const t of fragment.transitions) {
    uniqueTransitions.set(`${t.from}->${t.to}:${t.symbol}`, { ...t });
  }

  return {
    states: [...uniqueStates.values()].sort((a, b) => a.id - b.id),
    transitions: [...uniqueTransitions.values()],
    startState: fragment.startState,
    acceptState: fragment.acceptState,
    alphabet: new Set(fragment.alphabet),
  };
}

function toCoreOperation(type: ConstructionStep['type']): CoreOperation {
  if (type === 'plus' || type === 'optional') {
    return 'star';
  }
  return type;
}

function mergeFragments(a: Fragment, b: Fragment): { states: NFAState[]; transitions: NFATransition[] } {
  return {
    states: [...a.states, ...b.states],
    transitions: [...a.transitions, ...b.transitions],
  };
}

export function insertExplicitConcat(regex: string): string {
  const cleaned = regex.replace(/\s+/g, '');
  if (cleaned.length <= 1) {
    return cleaned;
  }

  let result = '';
  for (let i = 0; i < cleaned.length; i += 1) {
    const current = cleaned[i];
    const next = cleaned[i + 1];
    result += current;
    if (!next) {
      continue;
    }

    const needsConcat =
      (isSymbolChar(current) && (isSymbolChar(next) || next === '(')) ||
      (current === ')' && (isSymbolChar(next) || next === '(')) ||
      ((current === '*' || current === '+' || current === '?') && (isSymbolChar(next) || next === '('));

    if (needsConcat) {
      result += '.';
    }
  }
  return result;
}

export function toPostfix(regex: string): string {
  const precedence: Record<string, number> = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };
  const output: string[] = [];
  const operators: string[] = [];

  for (const token of regex) {
    if (isSymbolChar(token)) {
      output.push(token);
      continue;
    }
    if (token === '(') {
      operators.push(token);
      continue;
    }
    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as string);
      }
      if (operators.pop() !== '(') {
        throw new Error('Mismatched parentheses');
      }
      continue;
    }
    if (!isOperator(token)) {
      throw new Error(`Unsupported token '${token}'`);
    }

    while (
      operators.length > 0 &&
      operators[operators.length - 1] !== '(' &&
      precedence[operators[operators.length - 1]] >= precedence[token]
    ) {
      output.push(operators.pop() as string);
    }
    operators.push(token);
  }

  while (operators.length > 0) {
    const op = operators.pop() as string;
    if (op === '(' || op === ')') {
      throw new Error('Mismatched parentheses');
    }
    output.push(op);
  }

  return output.join('');
}

export function buildNFA(postfix: string): { nfa: NFA; steps: ConstructionStep[] } {
  const fragmentStack: Fragment[] = [];
  const steps: ConstructionStep[] = [];
  let stepNumber = 1;

  const pushStep = (
    type: ConstructionStep['type'],
    description: string,
    fragmentStates: number[],
    fragmentTransitions: NFATransition[],
    currentFragment: Fragment
  ): void => {
    const nfaSnapshot = makeNFAFromFragment(currentFragment);
    steps.push({
      stepNumber,
      operation: toCoreOperation(type),
      type,
      description,
      regex: postfix,
      fragmentStates,
      fragmentTransitions: fragmentTransitions.map((t) => ({ ...t })),
      nfa: cloneNFA(nfaSnapshot),
      highlightStates: [...fragmentStates],
      highlightTransitions: fragmentTransitions.map((_, idx) => idx),
    });
    stepNumber += 1;
  };

  for (const token of postfix) {
    if (isSymbolChar(token)) {
      const start = createState(true, false);
      const accept = createState(false, true);
      const transition: NFATransition = { from: start.id, to: accept.id, symbol: token };
      const fragment: Fragment = {
        states: [start, accept],
        transitions: [transition],
        startState: start.id,
        acceptState: accept.id,
        alphabet: token === 'ε' ? new Set<string>() : new Set<string>([token]),
      };
      fragmentStack.push(fragment);
      pushStep(
        'symbol',
        `Created basic NFA for symbol '${token}'`,
        [start.id, accept.id],
        [transition],
        fragment
      );
      continue;
    }

    if (token === '.') {
      if (fragmentStack.length < 2) {
        throw new Error('Invalid regex: missing operand for concatenation');
      }
      const nfa2 = fragmentStack.pop() as Fragment;
      const nfa1 = fragmentStack.pop() as Fragment;
      const epsilonJoin: NFATransition = { from: nfa1.acceptState, to: nfa2.startState, symbol: 'ε' };
      const merged = mergeFragments(nfa1, nfa2);
      const fragment: Fragment = {
        states: merged.states,
        transitions: [...merged.transitions, epsilonJoin],
        startState: nfa1.startState,
        acceptState: nfa2.acceptState,
        alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
      };
      fragmentStack.push(fragment);
      pushStep('concat', 'Connected two NFAs using concatenation', [nfa1.acceptState, nfa2.startState], [epsilonJoin], fragment);
      continue;
    }

    if (token === '|') {
      if (fragmentStack.length < 2) {
        throw new Error('Invalid regex: missing operand for union');
      }
      const nfa2 = fragmentStack.pop() as Fragment;
      const nfa1 = fragmentStack.pop() as Fragment;
      const newStart = createState(true, false);
      const newAccept = createState(false, true);
      const addedTransitions: NFATransition[] = [
        { from: newStart.id, to: nfa1.startState, symbol: 'ε' },
        { from: newStart.id, to: nfa2.startState, symbol: 'ε' },
        { from: nfa1.acceptState, to: newAccept.id, symbol: 'ε' },
        { from: nfa2.acceptState, to: newAccept.id, symbol: 'ε' },
      ];
      const merged = mergeFragments(nfa1, nfa2);
      const fragment: Fragment = {
        states: [newStart, ...merged.states, newAccept],
        transitions: [...merged.transitions, ...addedTransitions],
        startState: newStart.id,
        acceptState: newAccept.id,
        alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
      };
      fragmentStack.push(fragment);
      pushStep('union', 'Connected two NFAs using union', [newStart.id, newAccept.id], addedTransitions, fragment);
      continue;
    }

    if (token === '*') {
      if (fragmentStack.length < 1) {
        throw new Error('Invalid regex: missing operand for star');
      }
      const old = fragmentStack.pop() as Fragment;
      const newStart = createState(true, false);
      const newAccept = createState(false, true);
      const addedTransitions: NFATransition[] = [
        { from: newStart.id, to: old.startState, symbol: 'ε' },
        { from: newStart.id, to: newAccept.id, symbol: 'ε' },
        { from: old.acceptState, to: old.startState, symbol: 'ε' },
        { from: old.acceptState, to: newAccept.id, symbol: 'ε' },
      ];
      const fragment: Fragment = {
        states: [newStart, ...old.states, newAccept],
        transitions: [...old.transitions, ...addedTransitions],
        startState: newStart.id,
        acceptState: newAccept.id,
        alphabet: new Set(old.alphabet),
      };
      fragmentStack.push(fragment);
      pushStep('star', 'Applied Kleene star to NFA fragment', [newStart.id, newAccept.id], addedTransitions, fragment);
      continue;
    }

    if (token === '+') {
      if (fragmentStack.length < 1) {
        throw new Error('Invalid regex: missing operand for plus');
      }
      const old = fragmentStack.pop() as Fragment;
      const newStart = createState(true, false);
      const newAccept = createState(false, true);
      const addedTransitions: NFATransition[] = [
        { from: newStart.id, to: old.startState, symbol: 'ε' },
        { from: old.acceptState, to: old.startState, symbol: 'ε' },
        { from: old.acceptState, to: newAccept.id, symbol: 'ε' },
      ];
      const fragment: Fragment = {
        states: [newStart, ...old.states, newAccept],
        transitions: [...old.transitions, ...addedTransitions],
        startState: newStart.id,
        acceptState: newAccept.id,
        alphabet: new Set(old.alphabet),
      };
      fragmentStack.push(fragment);
      pushStep('plus', 'Applied one-or-more operator to NFA fragment', [newStart.id, newAccept.id], addedTransitions, fragment);
      continue;
    }

    if (token === '?') {
      if (fragmentStack.length < 1) {
        throw new Error('Invalid regex: missing operand for optional');
      }
      const old = fragmentStack.pop() as Fragment;
      const newStart = createState(true, false);
      const newAccept = createState(false, true);
      const addedTransitions: NFATransition[] = [
        { from: newStart.id, to: old.startState, symbol: 'ε' },
        { from: newStart.id, to: newAccept.id, symbol: 'ε' },
        { from: old.acceptState, to: newAccept.id, symbol: 'ε' },
      ];
      const fragment: Fragment = {
        states: [newStart, ...old.states, newAccept],
        transitions: [...old.transitions, ...addedTransitions],
        startState: newStart.id,
        acceptState: newAccept.id,
        alphabet: new Set(old.alphabet),
      };
      fragmentStack.push(fragment);
      pushStep('optional', 'Applied optional operator to NFA fragment', [newStart.id, newAccept.id], addedTransitions, fragment);
      continue;
    }

    throw new Error(`Unsupported postfix token '${token}'`);
  }

  if (fragmentStack.length !== 1) {
    throw new Error('Invalid postfix expression: unresolved fragments remain');
  }

  return { nfa: makeNFAFromFragment(fragmentStack[0]), steps };
}

function nfaToFlow(nfa: NFA): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = nfa.states.map((state) => ({
    id: `state-${state.id}`,
    data: {
      label: `q${state.id}`,
      isStart: state.id === nfa.startState,
      isAccept: state.id === nfa.acceptState,
    },
  }));
  const edges: FlowEdge[] = nfa.transitions.map((t, idx) => ({
    id: `edge-${idx}-${t.from}-${t.to}-${t.symbol}`,
    source: `state-${t.from}`,
    target: `state-${t.to}`,
    label: t.symbol,
  }));
  return { nodes, edges };
}

function dfaToFlow(dfa: DFA): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = dfa.states.map((state) => ({
    id: `state-${state.id}`,
    data: {
      label: state.id,
      isStart: state.isStart,
      isAccept: state.isAccept,
      nfaStates: [...state.nfaStates].sort((a, b) => a - b),
    },
  }));
  const edges: FlowEdge[] = dfa.transitions.map((t, idx) => ({
    id: `edge-${idx}-${t.from}-${t.to}-${t.symbol}`,
    source: `state-${t.from}`,
    target: `state-${t.to}`,
    label: t.symbol,
  }));
  return { nodes, edges };
}

export function parseRegex(regex: string): { nfa: NFA; steps: ConstructionStep[] } {
  resetStateCounter();
  const normalized = regex.replace(/\s+/g, '');
  if (!normalized) {
    const start = createState(true, false);
    const accept = createState(false, true);
    const epsilonEdge: NFATransition = { from: start.id, to: accept.id, symbol: 'ε' };
    const nfa: NFA = {
      states: [start, accept],
      transitions: [epsilonEdge],
      startState: start.id,
      acceptState: accept.id,
      alphabet: new Set<string>(),
    };
    const step: ConstructionStep = {
      stepNumber: 1,
      operation: 'symbol',
      type: 'symbol',
      description: "Created basic NFA for symbol 'ε'",
      regex: 'ε',
      fragmentStates: [start.id, accept.id],
      fragmentTransitions: [epsilonEdge],
      nfa: cloneNFA(nfa),
      highlightStates: [start.id, accept.id],
      highlightTransitions: [0],
    };
    return { nfa, steps: [step] };
  }
  const withConcat = insertExplicitConcat(normalized);
  const postfix = toPostfix(withConcat);
  return buildNFA(postfix);
}

export function processRegex(regex: string, simulationInput?: string): ProcessRegexResult {
  try {
    resetStateCounter();
    const normalized = regex.replace(/\s+/g, '');
    const explicitRegex = insertExplicitConcat(normalized);
    const postfix = toPostfix(explicitRegex);
    const built = buildNFA(postfix);
    const converted = convertToDFA(built.nfa);
    const simulation = simulationInput !== undefined ? simulateNFA(built.nfa, simulationInput) : null;

    return {
      nfa: nfaToFlow(built.nfa),
      steps: built.steps,
      dfa: dfaToFlow(converted.dfa),
      simulation,
      raw: {
        explicitRegex,
        postfix,
        nfa: built.nfa,
        dfa: converted.dfa,
      },
    };
  } catch (error) {
    return {
      nfa: { nodes: [], edges: [] },
      steps: [],
      dfa: { nodes: [], edges: [] },
      simulation: null,
      raw: {
        explicitRegex: '',
        postfix: '',
        nfa: { states: [], transitions: [], startState: -1, acceptState: -1, alphabet: new Set() },
        dfa: { states: [], transitions: [], startState: '', acceptStates: [], alphabet: new Set() },
      },
      error: (error as Error).message,
    };
  }
}

export function validateRegex(regex: string): { valid: boolean; error?: string } {
  try {
    const cleaned = regex.replace(/\s+/g, '');
    if (!cleaned) {
      return { valid: true };
    }

    let balance = 0;
    for (const ch of cleaned) {
      if (ch === '(') {
        balance += 1;
      } else if (ch === ')') {
        balance -= 1;
      }
      if (balance < 0) {
        return { valid: false, error: 'Unmatched closing parenthesis' };
      }
      if (!isSymbolChar(ch) && !['(', ')', '|', '*', '+', '?'].includes(ch)) {
        return { valid: false, error: `Unsupported token '${ch}'` };
      }
    }
    if (balance !== 0) {
      return { valid: false, error: 'Unmatched opening parenthesis' };
    }

    const explicit = insertExplicitConcat(cleaned);
    const postfix = toPostfix(explicit);
    buildNFA(postfix);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}
