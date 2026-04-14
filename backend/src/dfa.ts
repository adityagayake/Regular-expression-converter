// dfa.ts - DFA conversion and simulation

import { State, Automaton, AutomatonOutput } from './types.js';
import { NFAOperations } from './nfa.js';

export class DFAConversion {
  static convertToDFA(nfa: Automaton): Automaton {
    if (!nfa.states || !Array.isArray(nfa.states)) throw new Error('Invalid NFA: states not properly initialized');
    if (!nfa.start) throw new Error('Invalid NFA: no start state');
    if (!nfa.accept || !Array.isArray(nfa.accept)) throw new Error('Invalid NFA: accept states not properly initialized');

    const dfaStates: State[] = [];
    const stateMap = new Map<string, string>(); // NFA state set -> DFA state ID
    const unmarkedStates: Set<string> = new Set();
    const alphabet = this.getAlphabet(nfa);

    // Start state
    const startClosure = NFAOperations.computeEpsilonClosure(nfa, new Set([nfa.start]));
    const startKey = this.setToKey(startClosure);
    const dfaStartId = `q${dfaStates.length}`;
    stateMap.set(startKey, dfaStartId);
    unmarkedStates.add(startKey);

    while (unmarkedStates.size > 0) {
      const currentKey = Array.from(unmarkedStates)[0];
      unmarkedStates.delete(currentKey);
      const currentStates = this.keyToSet(currentKey);
      const dfaStateId = stateMap.get(currentKey)!;

      const dfaState: State = {
        id: dfaStateId,
        transitions: new Map(),
        epsilonTransitions: new Set(),
      };

      for (const symbol of alphabet) {
        const nextStates = NFAOperations.getTransitions(nfa, currentStates, symbol);
        const closure = NFAOperations.computeEpsilonClosure(nfa, nextStates);
        if (closure.size > 0) {
          const nextKey = this.setToKey(closure);
          let nextDfaId = stateMap.get(nextKey);
          if (!nextDfaId) {
            nextDfaId = `q${dfaStates.length}`;
            stateMap.set(nextKey, nextDfaId);
            unmarkedStates.add(nextKey);
          }
          dfaState.transitions.set(symbol, new Set([nextDfaId]));
        }
      }

      dfaStates.push(dfaState);
    }

    // Determine accept states
    const acceptStates: string[] = [];
    for (const [nfaKey, dfaId] of stateMap) {
      const nfaStates = this.keyToSet(nfaKey);
      if (Array.from(nfaStates).some(stateId => nfa.accept.includes(stateId))) {
        acceptStates.push(dfaId);
      }
    }

    return {
      states: dfaStates,
      start: stateMap.get(startKey)!,
      accept: acceptStates,
    };
  }

  static simulate(dfa: Automaton, input: string): { accepted: boolean; trace: string[] } {
    if (!dfa.states || !Array.isArray(dfa.states)) throw new Error('Invalid DFA: states not properly initialized');
    if (!dfa.start) throw new Error('Invalid DFA: no start state');
    if (!dfa.accept || !Array.isArray(dfa.accept)) throw new Error('Invalid DFA: accept states not properly initialized');

    let currentState = dfa.start;
    const trace: string[] = [currentState];

    for (const symbol of input) {
      const state = dfa.states.find((s: State) => s.id === currentState);
      if (!state) {
        currentState = ''; // dead state
        trace.push('');
        break;
      }
      if (!state.transitions || !(state.transitions instanceof Map)) throw new Error(`Invalid transitions for state ${currentState}`);

      const targets = state.transitions.get(symbol);
      if (!targets || targets.size === 0) {
        currentState = ''; // dead state
        trace.push('');
        break;
      }

      currentState = Array.from(targets)[0];
      trace.push(currentState);
    }

    const accepted = dfa.accept.includes(currentState);
    return { accepted, trace };
  }

  private static getAlphabet(nfa: Automaton): Set<string> {
    const alphabet = new Set<string>();
    for (const state of nfa.states) {
      if (!state.transitions || !(state.transitions instanceof Map)) continue;
      for (const symbol of state.transitions.keys()) {
        if (symbol !== 'ε') {
          alphabet.add(symbol);
        }
      }
    }
    return alphabet;
  }

  private static setToKey(states: Set<string>): string {
    return Array.from(states).sort().join(',');
  }

  private static keyToSet(key: string): Set<string> {
    return new Set(key.split(','));
  }
}