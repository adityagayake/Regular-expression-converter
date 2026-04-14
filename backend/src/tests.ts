// tests.ts - Test cases for the automata backend

import { RegexParser } from './parser.js';
import { ThompsonConstruction } from './thompson.js';
import { NFAOperations } from './nfa.js';
import { DFAConversion } from './dfa.js';
import { Simulator } from './simulator.js';

function testParser() {
  // Test cases
  const tests = [
    { input: 'a', expected: ['a'] },
    { input: 'a|b', expected: ['a', 'b', '|'] },
    { input: 'ab', expected: ['a', 'b', '.'] },
    { input: 'a*', expected: ['a', '*'] },
    { input: '(a|b)*abb', expected: ['a', 'b', '|', '*', 'a', '.', 'b', '.', 'b', '.'] },
  ];

  for (const test of tests) {
    try {
      const result = RegexParser.parse(test.input);
      if (JSON.stringify(result) === JSON.stringify(test.expected)) {
        // Test passed
      } else {
        throw new Error(`Expected ${test.expected}, got ${result}`);
      }
    } catch (error) {
      throw new Error(`Test failed for ${test.input}: ${error}`);
    }
  }
}

function testThompson() {
  const thompson = new ThompsonConstruction();

  // Test 'a'
  const postfixA = RegexParser.parse('a');
  const { automaton: nfaA } = thompson.buildNFA(postfixA);

  // Test 'a|b'
  const postfixAB = RegexParser.parse('a|b');
  const { automaton: nfaAB } = thompson.buildNFA(postfixAB);
}

function testSimulation() {
  // Test (a|b)*abb with input "abb"
  const result = Simulator.simulate('(a|b)*abb', 'abb', 'nfa');
}

function testDFAConversion() {
  const thompson = new ThompsonConstruction();
  const postfix = RegexParser.parse('a|b');
  const { automaton: nfa } = thompson.buildNFA(postfix);
  const dfa = DFAConversion.convertToDFA(nfa);
}

// Run tests
testParser();
testThompson();
testSimulation();
testDFAConversion();