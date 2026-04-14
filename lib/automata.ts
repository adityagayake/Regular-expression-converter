// automata.ts — single source of truth for NFA/DFA logic (frontend)
// State uses plain objects + arrays only (no Map/Set)

export interface State {
  id: number;
  transitions: Record<string, number[]>; // label -> target ids
  isStart: boolean;
  isAccept: boolean;
}

export interface Transition {
  from: number;
  to: number;
  symbol: string;
}

export interface NFA {
  states: State[];
  transitions: Transition[];
  startState: number;
  acceptState: number;
  alphabet: string[];
}

export interface DFAState {
  id: string;
  nfaStates: number[];
  isStart: boolean;
  isAccept: boolean;
}

export interface DFA {
  states: DFAState[];
  transitions: Transition[];
  startState: string;
  acceptStates: string[];
  alphabet: string[];
}

export type CoreOp = "symbol" | "concat" | "union" | "star";

export interface ConstructionStep {
  stepNumber: number;
  operation: CoreOp;
  type: CoreOp | "plus" | "optional";
  description: string;
  regex: string;
  fragmentStates: number[];
  fragmentTransitions: Transition[];
  newNodeIds: number[];
  newEdges: Transition[];
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

export interface ProcessRegexResult {
  nfa: NFA;
  steps: ConstructionStep[];
  dfa: DFA;
  simulation: SimulationResult | null;
  explicitRegex: string;
  postfix: string;
}

// ─── Internal fragment type ───────────────────────────────────────────────────

interface Fragment {
  start: State;
  accept: State;
  states: State[];
}

// ─── State counter ────────────────────────────────────────────────────────────

let stateCounter = 0;

function resetStateCounter(): void {
  stateCounter = 0;
}

function createState(): State {
  return { id: stateCounter++, transitions: {}, isStart: false, isAccept: false };
}

function addTransition(state: State, label: string, targetId: number): void {
  if (!state.transitions[label]) state.transitions[label] = [];
  if (!state.transitions[label].includes(targetId)) {
    state.transitions[label].push(targetId);
  }
}

// ─── Fragment → NFA ───────────────────────────────────────────────────────────

function fragmentToNFA(fragment: Fragment): NFA {
  const transitions: Transition[] = [];
  const alphabetSet = new Set<string>();

  for (const state of fragment.states) {
    for (const [symbol, targets] of Object.entries(state.transitions)) {
      if (symbol !== "ε") alphabetSet.add(symbol);
      for (const target of targets) {
        transitions.push({ from: state.id, to: target, symbol });
      }
    }
  }

  const states = fragment.states.map((s) => ({
    ...s,
    isStart: s.id === fragment.start.id,
    isAccept: s.id === fragment.accept.id,
  }));

  return {
    states,
    transitions,
    startState: fragment.start.id,
    acceptState: fragment.accept.id,
    alphabet: [...alphabetSet].sort(),
  };
}

// ─── Thompson construction helpers ───────────────────────────────────────────

function buildSymbol(c: string, steps: ConstructionStep[], regex: string): Fragment {
  const s0 = createState();
  const s1 = createState();
  addTransition(s0, c, s1.id);
  const frag: Fragment = { start: s0, accept: s1, states: [s0, s1] };
  const edge: Transition = { from: s0.id, to: s1.id, symbol: c };
  steps.push({
    stepNumber: steps.length + 1,
    operation: "symbol",
    type: "symbol",
    description: `Created NFA for symbol '${c}'`,
    regex,
    fragmentStates: [s0.id, s1.id],
    fragmentTransitions: [edge],
    newNodeIds: [s0.id, s1.id],
    newEdges: [edge],
  });
  return frag;
}

function buildUnion(f1: Fragment, f2: Fragment, steps: ConstructionStep[], regex: string): Fragment {
  const ns = createState();
  const na = createState();
  addTransition(ns, "ε", f1.start.id);
  addTransition(ns, "ε", f2.start.id);
  addTransition(f1.accept, "ε", na.id);
  addTransition(f2.accept, "ε", na.id);
  const allStates = [ns, ...f1.states, ...f2.states, na];
  const newEdges: Transition[] = [
    { from: ns.id, to: f1.start.id, symbol: "ε" },
    { from: ns.id, to: f2.start.id, symbol: "ε" },
    { from: f1.accept.id, to: na.id, symbol: "ε" },
    { from: f2.accept.id, to: na.id, symbol: "ε" },
  ];
  steps.push({
    stepNumber: steps.length + 1,
    operation: "union",
    type: "union",
    description: "Union: new start → both branches, both accepts → new accept",
    regex,
    fragmentStates: allStates.map((s) => s.id),
    fragmentTransitions: newEdges,
    newNodeIds: [ns.id, na.id],
    newEdges,
  });
  return { start: ns, accept: na, states: allStates };
}

function buildConcatenate(f1: Fragment, f2: Fragment, steps: ConstructionStep[], regex: string): Fragment {
  addTransition(f1.accept, "ε", f2.start.id);
  const allStates = [...f1.states, ...f2.states];
  const newEdge: Transition = { from: f1.accept.id, to: f2.start.id, symbol: "ε" };
  steps.push({
    stepNumber: steps.length + 1,
    operation: "concat",
    type: "concat",
    description: "Concatenation: f1.accept →ε→ f2.start",
    regex,
    fragmentStates: allStates.map((s) => s.id),
    fragmentTransitions: [newEdge],
    newNodeIds: [],
    newEdges: [newEdge],
  });
  return { start: f1.start, accept: f2.accept, states: allStates };
}

function buildKleeneStar(f: Fragment, steps: ConstructionStep[], regex: string): Fragment {
  const ns = createState();
  const na = createState();
  addTransition(ns, "ε", f.start.id);
  addTransition(ns, "ε", na.id);
  addTransition(f.accept, "ε", f.start.id);
  addTransition(f.accept, "ε", na.id);
  const allStates = [ns, ...f.states, na];
  const newEdges: Transition[] = [
    { from: ns.id, to: f.start.id, symbol: "ε" },
    { from: ns.id, to: na.id, symbol: "ε" },
    { from: f.accept.id, to: f.start.id, symbol: "ε" },
    { from: f.accept.id, to: na.id, symbol: "ε" },
  ];
  steps.push({
    stepNumber: steps.length + 1,
    operation: "star",
    type: "star",
    description: "Kleene star: new start/accept, loop back from old accept",
    regex,
    fragmentStates: allStates.map((s) => s.id),
    fragmentTransitions: newEdges,
    newNodeIds: [ns.id, na.id],
    newEdges,
  });
  return { start: ns, accept: na, states: allStates };
}

function buildPlus(f: Fragment, steps: ConstructionStep[], regex: string): Fragment {
  // A+ = AA* — implemented as: ns →ε→ f.start, f.accept →ε→ f.start, f.accept →ε→ na
  const ns = createState();
  const na = createState();
  addTransition(ns, "ε", f.start.id);
  addTransition(f.accept, "ε", f.start.id);
  addTransition(f.accept, "ε", na.id);
  const allStates = [ns, ...f.states, na];
  const newEdges: Transition[] = [
    { from: ns.id, to: f.start.id, symbol: "ε" },
    { from: f.accept.id, to: f.start.id, symbol: "ε" },
    { from: f.accept.id, to: na.id, symbol: "ε" },
  ];
  steps.push({
    stepNumber: steps.length + 1,
    operation: "star",
    type: "plus",
    description: "Plus (+): must match at least once, then loop",
    regex,
    fragmentStates: allStates.map((s) => s.id),
    fragmentTransitions: newEdges,
    newNodeIds: [ns.id, na.id],
    newEdges,
  });
  return { start: ns, accept: na, states: allStates };
}

function buildOptional(f: Fragment, steps: ConstructionStep[], regex: string): Fragment {
  const ns = createState();
  const na = createState();
  addTransition(ns, "ε", f.start.id);
  addTransition(ns, "ε", na.id);
  addTransition(f.accept, "ε", na.id);
  const allStates = [ns, ...f.states, na];
  const newEdges: Transition[] = [
    { from: ns.id, to: f.start.id, symbol: "ε" },
    { from: ns.id, to: na.id, symbol: "ε" },
    { from: f.accept.id, to: na.id, symbol: "ε" },
  ];
  steps.push({
    stepNumber: steps.length + 1,
    operation: "star",
    type: "optional",
    description: "Optional (?): match zero or one time",
    regex,
    fragmentStates: allStates.map((s) => s.id),
    fragmentTransitions: newEdges,
    newNodeIds: [ns.id, na.id],
    newEdges,
  });
  return { start: ns, accept: na, states: allStates };
}

// ─── Recursive descent parser ─────────────────────────────────────────────────

function parseRegex(input: string): { fragment: Fragment; steps: ConstructionStep[] } {
  resetStateCounter();
  const cleaned = input.replace(/\s+/g, "");
  if (!cleaned) throw new Error("Regex cannot be empty");

  let pos = 0;
  const steps: ConstructionStep[] = [];

  const peek = (): string | null => (pos < cleaned.length ? cleaned[pos] : null);
  const consume = (expected?: string): string => {
    if (pos >= cleaned.length) throw new Error(`Unexpected end of input at position ${pos}`);
    const ch = cleaned[pos];
    if (expected !== undefined && ch !== expected)
      throw new Error(`Expected '${expected}' but got '${ch}' at position ${pos}`);
    pos++;
    return ch;
  };

  // parseAtom: handles literals and parenthesised groups
  const parseAtom = (): Fragment => {
    const ch = peek();
    if (ch === "(") {
      consume("(");
      const inner = parseAlternation();
      consume(")");
      return inner;
    }
    if (ch !== null && ch !== "|" && ch !== ")" && ch !== "*" && ch !== "+" && ch !== "?") {
      const sym = consume();
      return buildSymbol(sym, steps, cleaned);
    }
    throw new Error(`Unexpected token '${ch ?? "EOF"}' at position ${pos}`);
  };

  // parseStar: handles *, +, ?
  const parseStar = (): Fragment => {
    let base = parseAtom();
    for (;;) {
      const ch = peek();
      if (ch === "*") {
        consume("*");
        base = buildKleeneStar(base, steps, cleaned);
      } else if (ch === "+") {
        consume("+");
        base = buildPlus(base, steps, cleaned);
      } else if (ch === "?") {
        consume("?");
        base = buildOptional(base, steps, cleaned);
      } else {
        break;
      }
    }
    return base;
  };

  // parseConcatenation: implicit concatenation
  const parseConcatenation = (): Fragment => {
    let left = parseStar();
    for (;;) {
      const ch = peek();
      if (ch === null || ch === "|" || ch === ")") break;
      const right = parseStar();
      left = buildConcatenate(left, right, steps, cleaned);
    }
    return left;
  };

  // parseAlternation: handles |
  const parseAlternation = (): Fragment => {
    let left = parseConcatenation();
    while (peek() === "|") {
      consume("|");
      const right = parseConcatenation();
      left = buildUnion(left, right, steps, cleaned);
    }
    return left;
  };

  const fragment = parseAlternation();
  if (pos !== cleaned.length) {
    throw new Error(`Unexpected character '${cleaned[pos]}' at position ${pos}`);
  }
  return { fragment, steps };
}

// ─── Epsilon closure & move ───────────────────────────────────────────────────

function epsilonClosure(stateIds: number[], statesById: Record<number, State>): number[] {
  const closure = new Set(stateIds);
  const stack = [...stateIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const state = statesById[id];
    if (!state) continue;
    for (const targetId of (state.transitions["ε"] ?? [])) {
      if (!closure.has(targetId)) {
        closure.add(targetId);
        stack.push(targetId);
      }
    }
  }
  return [...closure].sort((a, b) => a - b);
}

function moveOnSymbol(stateIds: number[], symbol: string, statesById: Record<number, State>): number[] {
  const result = new Set<number>();
  for (const id of stateIds) {
    const state = statesById[id];
    if (!state) continue;
    for (const targetId of (state.transitions[symbol] ?? [])) {
      result.add(targetId);
    }
  }
  return [...result].sort((a, b) => a - b);
}

// ─── DFA conversion (subset construction) ────────────────────────────────────

export function convertToDFA(nfa: NFA): DFA {
  const statesById: Record<number, State> = {};
  for (const s of nfa.states) statesById[s.id] = s;

  const alphabet = nfa.alphabet.filter((l) => l !== "ε").sort();
  const subsetKey = (arr: number[]) => arr.join(",");

  const startClosure = epsilonClosure([nfa.startState], statesById);
  const dfaStates: DFAState[] = [];
  const dfaTransitions: Transition[] = [];
  const subsetMap: Record<string, string> = {};
  let counter = 0;

  const startDFA: DFAState = {
    id: "D" + counter++,
    nfaStates: startClosure,
    isStart: true,
    isAccept: startClosure.includes(nfa.acceptState),
  };
  subsetMap[subsetKey(startClosure)] = startDFA.id;
  dfaStates.push(startDFA);
  const worklist: DFAState[] = [startDFA];

  while (worklist.length > 0) {
    const current = worklist.shift()!;
    for (const symbol of alphabet) {
      const moved = moveOnSymbol(current.nfaStates, symbol, statesById);
      if (moved.length === 0) continue;
      const closure = epsilonClosure(moved, statesById);
      const key = subsetKey(closure);
      let targetId = subsetMap[key];
      if (!targetId) {
        const newDFA: DFAState = {
          id: "D" + counter++,
          nfaStates: closure,
          isStart: false,
          isAccept: closure.includes(nfa.acceptState),
        };
        subsetMap[key] = newDFA.id;
        dfaStates.push(newDFA);
        worklist.push(newDFA);
        targetId = newDFA.id;
      }
      dfaTransitions.push({ from: current.id as unknown as number, to: targetId as unknown as number, symbol });
    }
  }

  return {
    states: dfaStates,
    transitions: dfaTransitions,
    startState: startDFA.id,
    acceptStates: dfaStates.filter((s) => s.isAccept).map((s) => s.id),
    alphabet,
  };
}

// ─── NFA simulation ───────────────────────────────────────────────────────────

export function simulateNFA(nfa: NFA, input: string): SimulationResult {
  const statesById: Record<number, State> = {};
  for (const s of nfa.states) statesById[s.id] = s;

  let current = epsilonClosure([nfa.startState], statesById);
  const steps: SimulationStep[] = [
    {
      position: -1,
      symbol: null,
      currentStates: current,
      description: `Start: ε-closure({q${nfa.startState}}) = {${current.map((id) => `q${id}`).join(", ")}}`,
      isAccepting: current.includes(nfa.acceptState),
    },
  ];

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const moved = moveOnSymbol(current, symbol, statesById);
    current = epsilonClosure(moved, statesById);
    steps.push({
      position: i,
      symbol,
      currentStates: current,
      description:
        current.length > 0
          ? `Read '${symbol}' → {${current.map((id) => `q${id}`).join(", ")}}`
          : `Read '${symbol}' → ∅ (dead)`,
      isAccepting: current.includes(nfa.acceptState),
    });
    if (current.length === 0) return { accepted: false, steps, inputString: input };
  }

  return { accepted: current.includes(nfa.acceptState), steps, inputString: input };
}

// ─── DFA simulation ───────────────────────────────────────────────────────────

export function simulateDFA(dfa: DFA, input: string): SimulationResult {
  const steps: SimulationStep[] = [];
  let current = dfa.startState;

  steps.push({
    position: -1,
    symbol: null,
    currentStates: [current as unknown as number],
    description: `Start at ${current}`,
    isAccepting: dfa.acceptStates.includes(current),
  });

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const transition = dfa.transitions.find((t) => String(t.from) === current && t.symbol === symbol);
    if (!transition) {
      steps.push({
        position: i,
        symbol,
        currentStates: [],
        description: `No transition from ${current} on '${symbol}' → rejected`,
        isAccepting: false,
      });
      return { accepted: false, steps, inputString: input };
    }
    current = String(transition.to);
    steps.push({
      position: i,
      symbol,
      currentStates: [current as unknown as number],
      description: `Read '${symbol}' → ${current}`,
      isAccepting: dfa.acceptStates.includes(current),
    });
  }

  return { accepted: dfa.acceptStates.includes(current), steps, inputString: input };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function processRegex(regex: string, input?: string): ProcessRegexResult {
  const cleaned = regex.replace(/\s+/g, "");
  if (!cleaned) throw new Error("Regex cannot be empty");

  const { fragment, steps } = parseRegex(cleaned);
  const nfa = fragmentToNFA(fragment);
  const dfa = convertToDFA(nfa);
  const simulation = input !== undefined ? simulateNFA(nfa, input) : null;

  return { nfa, steps, dfa, simulation, explicitRegex: cleaned, postfix: "" };
}
