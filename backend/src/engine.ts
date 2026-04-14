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

type CoreOperation = "symbol" | "concat" | "union" | "star";
export interface ConstructionStep {
  stepNumber: number;
  operation: CoreOperation;
  type: CoreOperation | "plus" | "optional";
  description: string;
  regex: string;
  fragmentStates: number[];
  fragmentTransitions: NFATransition[];
  nfa: NFA;
  highlightStates?: number[];
  highlightTransitions?: number[];
}

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
const resetStateCounter = (): void => {
  stateCounter = 0;
};

const isOperator = (ch: string): boolean => ch === "|" || ch === "." || ch === "*" || ch === "+" || ch === "?";
const isSymbolChar = (ch: string): boolean => ch.length === 1 && !isOperator(ch) && ch !== "(" && ch !== ")";
const createState = (isStart = false, isAccept = false): NFAState => ({ id: stateCounter++, isStart, isAccept });

const cloneNFA = (nfa: NFA): NFA => ({
  states: nfa.states.map((s) => ({ ...s })),
  transitions: nfa.transitions.map((t) => ({ ...t })),
  startState: nfa.startState,
  acceptState: nfa.acceptState,
  alphabet: new Set(nfa.alphabet),
});

function makeNFAFromFragment(fragment: Fragment): NFA {
  const stateMap = new Map<number, NFAState>();
  for (const s of fragment.states) {
    stateMap.set(s.id, { ...s, isStart: s.id === fragment.startState, isAccept: s.id === fragment.acceptState });
  }
  const transitionMap = new Map<string, NFATransition>();
  for (const t of fragment.transitions) {
    transitionMap.set(`${t.from}->${t.to}:${t.symbol}`, { ...t });
  }
  return {
    states: [...stateMap.values()].sort((a, b) => a.id - b.id),
    transitions: [...transitionMap.values()],
    startState: fragment.startState,
    acceptState: fragment.acceptState,
    alphabet: new Set(fragment.alphabet),
  };
}

const mergeFragments = (a: Fragment, b: Fragment): { states: NFAState[]; transitions: NFATransition[] } => ({
  states: [...a.states, ...b.states],
  transitions: [...a.transitions, ...b.transitions],
});

export function insertExplicitConcat(regex: string): string {
  const cleaned = regex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i < cleaned.length; i += 1) {
    const c = cleaned[i];
    const n = cleaned[i + 1];
    out += c;
    if (!n) continue;
    const concat =
      (isSymbolChar(c) && (isSymbolChar(n) || n === "(")) ||
      (c === ")" && (isSymbolChar(n) || n === "(")) ||
      ((c === "*" || c === "+" || c === "?") && (isSymbolChar(n) || n === "("));
    if (concat) out += ".";
  }
  return out;
}

export function toPostfix(regex: string): string {
  const precedence: Record<string, number> = { "|": 1, ".": 2, "*": 3, "+": 3, "?": 3 };
  const stack: string[] = [];
  const out: string[] = [];

  for (const token of regex) {
    if (isSymbolChar(token)) {
      out.push(token);
    } else if (token === "(") {
      stack.push(token);
    } else if (token === ")") {
      while (stack.length > 0 && stack[stack.length - 1] !== "(") {
        out.push(stack.pop() as string);
      }
      if (stack.pop() !== "(") throw new Error("Mismatched parentheses");
    } else {
      while (stack.length > 0 && stack[stack.length - 1] !== "(" && precedence[stack[stack.length - 1]] >= precedence[token]) {
        out.push(stack.pop() as string);
      }
      stack.push(token);
    }
  }
  while (stack.length > 0) {
    const op = stack.pop() as string;
    if (op === "(" || op === ")") throw new Error("Mismatched parentheses");
    out.push(op);
  }
  return out.join("");
}

const opToCore = (type: ConstructionStep["type"]): CoreOperation => (type === "plus" || type === "optional" ? "star" : type);

export function buildNFA(postfix: string): { nfa: NFA; steps: ConstructionStep[] } {
  const stack: Fragment[] = [];
  const steps: ConstructionStep[] = [];
  let stepNo = 1;

  const pushStep = (
    type: ConstructionStep["type"],
    description: string,
    fragmentStates: number[],
    fragmentTransitions: NFATransition[],
    fragment: Fragment
  ) => {
    steps.push({
      stepNumber: stepNo,
      operation: opToCore(type),
      type,
      description,
      regex: postfix,
      fragmentStates,
      fragmentTransitions: fragmentTransitions.map((t) => ({ ...t })),
      nfa: cloneNFA(makeNFAFromFragment(fragment)),
      highlightStates: [...fragmentStates],
      highlightTransitions: fragmentTransitions.map((_, idx) => idx),
    });
    stepNo += 1;
  };

  for (const token of postfix) {
    if (isSymbolChar(token)) {
      const s = createState(true, false);
      const a = createState(false, true);
      const tr: NFATransition = { from: s.id, to: a.id, symbol: token };
      const frag: Fragment = {
        states: [s, a],
        transitions: [tr],
        startState: s.id,
        acceptState: a.id,
        alphabet: token === "ε" ? new Set() : new Set([token]),
      };
      stack.push(frag);
      pushStep("symbol", `Created basic NFA for symbol '${token}'`, [s.id, a.id], [tr], frag);
      continue;
    }
    if (token === ".") {
      const nfa2 = stack.pop();
      const nfa1 = stack.pop();
      if (!nfa1 || !nfa2) throw new Error("Invalid regex: concat missing operands");
      const join: NFATransition = { from: nfa1.acceptState, to: nfa2.startState, symbol: "ε" };
      const merged = mergeFragments(nfa1, nfa2);
      const frag: Fragment = {
        states: merged.states,
        transitions: [...merged.transitions, join],
        startState: nfa1.startState,
        acceptState: nfa2.acceptState,
        alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
      };
      stack.push(frag);
      pushStep("concat", "Connected two NFAs using concatenation", [nfa1.acceptState, nfa2.startState], [join], frag);
      continue;
    }
    if (token === "|") {
      const nfa2 = stack.pop();
      const nfa1 = stack.pop();
      if (!nfa1 || !nfa2) throw new Error("Invalid regex: union missing operands");
      const ns = createState(true, false);
      const na = createState(false, true);
      const added: NFATransition[] = [
        { from: ns.id, to: nfa1.startState, symbol: "ε" },
        { from: ns.id, to: nfa2.startState, symbol: "ε" },
        { from: nfa1.acceptState, to: na.id, symbol: "ε" },
        { from: nfa2.acceptState, to: na.id, symbol: "ε" },
      ];
      const merged = mergeFragments(nfa1, nfa2);
      const frag: Fragment = {
        states: [ns, ...merged.states, na],
        transitions: [...merged.transitions, ...added],
        startState: ns.id,
        acceptState: na.id,
        alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
      };
      stack.push(frag);
      pushStep("union", "Connected two NFAs using union", [ns.id, na.id], added, frag);
      continue;
    }
    if (token === "*") {
      const old = stack.pop();
      if (!old) throw new Error("Invalid regex: star missing operand");
      const ns = createState(true, false);
      const na = createState(false, true);
      const added: NFATransition[] = [
        { from: ns.id, to: old.startState, symbol: "ε" },
        { from: ns.id, to: na.id, symbol: "ε" },
        { from: old.acceptState, to: old.startState, symbol: "ε" },
        { from: old.acceptState, to: na.id, symbol: "ε" },
      ];
      const frag: Fragment = {
        states: [ns, ...old.states, na],
        transitions: [...old.transitions, ...added],
        startState: ns.id,
        acceptState: na.id,
        alphabet: new Set(old.alphabet),
      };
      stack.push(frag);
      pushStep("star", "Applied Kleene star to NFA fragment", [ns.id, na.id], added, frag);
      continue;
    }
    if (token === "+") {
      const old = stack.pop();
      if (!old) throw new Error("Invalid regex: plus missing operand");
      const ns = createState(true, false);
      const na = createState(false, true);
      const added: NFATransition[] = [
        { from: ns.id, to: old.startState, symbol: "ε" },
        { from: old.acceptState, to: old.startState, symbol: "ε" },
        { from: old.acceptState, to: na.id, symbol: "ε" },
      ];
      const frag: Fragment = {
        states: [ns, ...old.states, na],
        transitions: [...old.transitions, ...added],
        startState: ns.id,
        acceptState: na.id,
        alphabet: new Set(old.alphabet),
      };
      stack.push(frag);
      pushStep("plus", "Applied one-or-more operator to NFA fragment", [ns.id, na.id], added, frag);
      continue;
    }
    if (token === "?") {
      const old = stack.pop();
      if (!old) throw new Error("Invalid regex: optional missing operand");
      const ns = createState(true, false);
      const na = createState(false, true);
      const added: NFATransition[] = [
        { from: ns.id, to: old.startState, symbol: "ε" },
        { from: ns.id, to: na.id, symbol: "ε" },
        { from: old.acceptState, to: na.id, symbol: "ε" },
      ];
      const frag: Fragment = {
        states: [ns, ...old.states, na],
        transitions: [...old.transitions, ...added],
        startState: ns.id,
        acceptState: na.id,
        alphabet: new Set(old.alphabet),
      };
      stack.push(frag);
      pushStep("optional", "Applied optional operator to NFA fragment", [ns.id, na.id], added, frag);
    }
  }

  if (stack.length !== 1) throw new Error("Invalid postfix expression");
  return { nfa: makeNFAFromFragment(stack[0]), steps };
}

const transitionsFrom = (stateId: number, transitions: NFATransition[]): NFATransition[] =>
  transitions.filter((t) => t.from === stateId);
const normalizeStateSet = (states: Set<number>): number[] => [...states].sort((a, b) => a - b);
const stateSetToId = (states: Set<number>): string => `{${normalizeStateSet(states).join(",")}}`;
const toIdSet = (states: Set<NFAState>): Set<number> => new Set([...states].map((s) => s.id));

export function epsilonClosure(states: Set<NFAState>, transitions: NFATransition[]): Set<NFAState> {
  const found = new Map<number, NFAState>();
  for (const s of states) found.set(s.id, s);
  const queue = [...states];
  while (queue.length > 0) {
    const curr = queue.shift() as NFAState;
    for (const tr of transitionsFrom(curr.id, transitions)) {
      if (tr.symbol !== "ε" || found.has(tr.to)) continue;
      const ns = { id: tr.to, isStart: false, isAccept: false };
      found.set(ns.id, ns);
      queue.push(ns);
    }
  }
  return new Set([...found.values()]);
}

export function move(states: Set<NFAState>, symbol: string, transitions: NFATransition[]): Set<NFAState> {
  const found = new Map<number, NFAState>();
  for (const s of states) {
    for (const tr of transitionsFrom(s.id, transitions)) {
      if (tr.symbol === symbol) found.set(tr.to, { id: tr.to, isStart: false, isAccept: false });
    }
  }
  return new Set([...found.values()]);
}

export function convertToDFA(nfa: NFA): { dfa: DFA } {
  const idToState = new Map<number, NFAState>();
  for (const state of nfa.states) idToState.set(state.id, state);
  const symbols = [...nfa.alphabet].filter((s) => s !== "ε").sort();
  const dfaStates = new Map<string, DFAState>();
  const dfaTransitions: DFATransition[] = [];
  const queue: string[] = [];

  const start = idToState.get(nfa.startState);
  if (!start) throw new Error("Invalid NFA start state");
  const startClosure = epsilonClosure(new Set([start]), nfa.transitions);
  const startIds = toIdSet(startClosure);
  const startId = stateSetToId(startIds);
  dfaStates.set(startId, { id: startId, nfaStates: startIds, isStart: true, isAccept: startIds.has(nfa.acceptState) });
  queue.push(startId);

  while (queue.length > 0) {
    const currId = queue.shift() as string;
    const curr = dfaStates.get(currId) as DFAState;
    const currConcrete = new Set([...curr.nfaStates].map((id) => idToState.get(id) ?? { id, isStart: false, isAccept: false }));
    for (const symbol of symbols) {
      const moved = move(currConcrete, symbol, nfa.transitions);
      if (moved.size === 0) continue;
      const closure = epsilonClosure(moved, nfa.transitions);
      const closureIds = toIdSet(closure);
      const nextId = stateSetToId(closureIds);
      if (!dfaStates.has(nextId)) {
        dfaStates.set(nextId, { id: nextId, nfaStates: closureIds, isStart: false, isAccept: closureIds.has(nfa.acceptState) });
        queue.push(nextId);
      }
      if (!dfaTransitions.some((t) => t.from === currId && t.to === nextId && t.symbol === symbol)) {
        dfaTransitions.push({ from: currId, to: nextId, symbol });
      }
    }
  }

  const states = [...dfaStates.values()];
  return {
    dfa: {
      states,
      transitions: dfaTransitions,
      startState: startId,
      acceptStates: states.filter((s) => s.isAccept).map((s) => s.id),
      alphabet: new Set(symbols),
    },
  };
}

export function simulateNFA(nfa: NFA, input: string): SimulationResult {
  const map = new Map<number, NFAState>();
  for (const s of nfa.states) map.set(s.id, s);
  const toStateSet = (ids: Set<number>): Set<NFAState> => new Set([...ids].map((id) => map.get(id) ?? { id, isStart: false, isAccept: false }));
  const toIds = (states: Set<NFAState>): Set<number> => new Set([...states].map((s) => s.id));

  let currentStates = epsilonClosure(toStateSet(new Set([nfa.startState])), nfa.transitions);
  let currentIds = toIds(currentStates);
  const steps: SimulationStep[] = [
    {
      position: -1,
      symbol: null,
      currentStates: [...currentIds].sort((a, b) => a - b),
      description: `Initial: ε-closure(start) = {${[...currentIds].sort((a, b) => a - b).join(", ")}}`,
      isAccepting: currentIds.has(nfa.acceptState),
    },
  ];

  for (let i = 0; i < input.length; i += 1) {
    const symbol = input[i];
    const moved = move(currentStates, symbol, nfa.transitions);
    currentStates = epsilonClosure(moved, nfa.transitions);
    currentIds = toIds(currentStates);
    const ordered = [...currentIds].sort((a, b) => a - b);
    steps.push({
      position: i,
      symbol,
      currentStates: ordered,
      description: currentIds.size > 0 ? `After '${symbol}': move + ε-closure = {${ordered.join(", ")}}` : `After '${symbol}': No valid states (stuck)`,
      isAccepting: currentIds.has(nfa.acceptState),
    });
    if (currentIds.size === 0) {
      return { accepted: false, steps, inputString: input };
    }
  }
  return { accepted: currentIds.has(nfa.acceptState), steps, inputString: input };
}

const nfaToFlow = (nfa: NFA): { nodes: FlowNode[]; edges: FlowEdge[] } => ({
  nodes: nfa.states.map((s) => ({
    id: `state-${s.id}`,
    data: { label: `q${s.id}`, isStart: s.id === nfa.startState, isAccept: s.id === nfa.acceptState },
  })),
  edges: nfa.transitions.map((t, idx) => ({
    id: `edge-${idx}-${t.from}-${t.to}-${t.symbol}`,
    source: `state-${t.from}`,
    target: `state-${t.to}`,
    label: t.symbol,
  })),
});

const dfaToFlow = (dfa: DFA): { nodes: FlowNode[]; edges: FlowEdge[] } => ({
  nodes: dfa.states.map((s) => ({
    id: `state-${s.id}`,
    data: {
      label: s.id,
      isStart: s.isStart,
      isAccept: s.isAccept,
      nfaStates: [...s.nfaStates].sort((a, b) => a - b),
    },
  })),
  edges: dfa.transitions.map((t, idx) => ({
    id: `edge-${idx}-${t.from}-${t.to}-${t.symbol}`,
    source: `state-${t.from}`,
    target: `state-${t.to}`,
    label: t.symbol,
  })),
});

export function processRegex(regex: string, simulationInput?: string): ProcessRegexResult {
  try {
    resetStateCounter();
    const normalized = regex.replace(/\s+/g, "");
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
      raw: { explicitRegex, postfix, nfa: built.nfa, dfa: converted.dfa },
    };
  } catch (error) {
    return {
      nfa: { nodes: [], edges: [] },
      steps: [],
      dfa: { nodes: [], edges: [] },
      simulation: null,
      raw: {
        explicitRegex: "",
        postfix: "",
        nfa: { states: [], transitions: [], startState: -1, acceptState: -1, alphabet: new Set() },
        dfa: { states: [], transitions: [], startState: "", acceptStates: [], alphabet: new Set() },
      },
      error: (error as Error).message,
    };
  }
}
