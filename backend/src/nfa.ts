// nfa.ts - NFA operations including epsilon closure

import { State, Automaton } from './types.js';

export class NFAOperations {
  static computeEpsilonClosure(nfa: Automaton, startStates: Set<string>): Set<string> {
    if (!nfa.states || !Array.isArray(nfa.states)) throw new Error('Invalid NFA: states not properly initialized');
    const closure = new Set<string>();
    const visited = new Set<string>();
    const stack = Array.from(startStates);

    while (stack.length > 0) {
      const stateId = stack.pop()!;
      if (visited.has(stateId)) continue;
      visited.add(stateId);
      closure.add(stateId);

      const state = nfa.states.find((s: State) => s.id === stateId);
      if (!state) continue;
      if (!state.epsilonTransitions || !(state.epsilonTransitions instanceof Set)) throw new Error(`Invalid epsilonTransitions for state ${stateId}`);

      for (const epsilonTarget of state.epsilonTransitions) {
        if (!visited.has(epsilonTarget)) {
          stack.push(epsilonTarget);
        }
      }
    }

    return closure;
  }

  static getTransitions(nfa: Automaton, states: Set<string>, symbol: string): Set<string> {
    if (!nfa.states || !Array.isArray(nfa.states)) throw new Error('Invalid NFA: states not properly initialized');
    const result = new Set<string>();

    for (const stateId of states) {
      const state = nfa.states.find((s: State) => s.id === stateId);
      if (!state) continue;
      if (!state.transitions || !(state.transitions instanceof Map)) throw new Error(`Invalid transitions for state ${stateId}`);

      const targets = state.transitions.get(symbol);
      if (targets) {
        for (const target of targets) {
          result.add(target);
        }
      }
    }

    return result;
  }

  static simulate(nfa: Automaton, input: string): { accepted: boolean; trace: string[] } {
    if (!nfa.states || !Array.isArray(nfa.states)) throw new Error('Invalid NFA: states not properly initialized');
    if (!nfa.start) throw new Error('Invalid NFA: no start state');
    if (!nfa.accept || !Array.isArray(nfa.accept)) throw new Error('Invalid NFA: accept states not properly initialized');

    let currentStates = this.computeEpsilonClosure(nfa, new Set([nfa.start]));
    const trace: string[] = [`{${Array.from(currentStates).sort().join(',')}}`];

    for (const symbol of input) {
      const nextStates = this.getTransitions(nfa, currentStates, symbol);
      currentStates = this.computeEpsilonClosure(nfa, nextStates);
      trace.push(`{${Array.from(currentStates).sort().join(',')}}`);
    }

    const accepted = Array.from(currentStates).some(stateId => nfa.accept.includes(stateId));
    return { accepted, trace };
  }
}