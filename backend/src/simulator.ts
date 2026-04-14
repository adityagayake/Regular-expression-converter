// simulator.ts - Simulation for NFA and DFA

import { Automaton, SimulationResult } from './types.js';
import { RegexParser } from './parser.js';
import { ThompsonConstruction } from './thompson.js';
import { NFAOperations } from './nfa.js';
import { DFAConversion } from './dfa.js';

export class Simulator {
  static simulate(regex: string, input: string, mode: 'nfa' | 'dfa'): SimulationResult {
    const postfix = RegexParser.parse(regex);
    const thompson = new ThompsonConstruction();
    const result = thompson.buildNFA(postfix);
    const nfa = result.automaton;

    if (mode === 'nfa') {
      return NFAOperations.simulate(nfa, input);
    } else {
      const dfa = DFAConversion.convertToDFA(nfa);
      return DFAConversion.simulate(dfa, input);
    }
  }
}