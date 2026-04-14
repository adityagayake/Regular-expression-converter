// thompson.ts - Thompson's Construction for ε-NFA

import { State, Fragment, Automaton, ConstructionStep } from './types.js';

export class ThompsonConstruction {
  private stateCounter = 0;
  private stepCounter = 0;
  private steps: ConstructionStep[] = [];

  buildNFA(postfix: string[]): { automaton: Automaton; steps: ConstructionStep[] } {
    this.steps = [];
    this.stepCounter = 0;
    const stack: Fragment[] = [];

    for (const token of postfix) {
      console.log('Stack before processing', token, ':', stack.length, 'fragments');
      if (token === '|') {
        if (stack.length < 2) throw new Error('Insufficient operands for union (|) operator');
        const frag2 = stack.pop()!;
        const frag1 = stack.pop()!;
        stack.push(this.union(frag1, frag2));
      } else if (token === '.') {
        if (stack.length < 2) throw new Error('Insufficient operands for concatenation (.) operator');
        const frag2 = stack.pop()!;
        const frag1 = stack.pop()!;
        stack.push(this.concatenation(frag1, frag2));
      } else if (token === '*') {
        if (stack.length < 1) throw new Error('Insufficient operands for Kleene star (*) operator');
        const frag = stack.pop()!;
        stack.push(this.kleeneStar(frag));
      } else {
        // symbol
        stack.push(this.symbol(token));
      }
      console.log('Stack after processing', token, ':', stack.length, 'fragments');
    }

    if (stack.length !== 1) {
      throw new Error('Invalid postfix expression: stack should have exactly one fragment');
    }

    const finalFragment = stack[0];
    if (!finalFragment.states || !Array.isArray(finalFragment.states)) {
      throw new Error('Invalid final fragment: states not properly initialized');
    }
    const automaton = {
      states: finalFragment.states,
      start: finalFragment.start,
      accept: [finalFragment.accept],
    };

    return { automaton, steps: this.steps };
  }

  private symbol(symbol: string): Fragment {
    const startId = this.newStateId();
    const acceptId = this.newStateId();

    const startState: State = {
      id: startId,
      transitions: new Map([[symbol, new Set([acceptId])]]),
      epsilonTransitions: new Set(),
    };

    const acceptState: State = {
      id: acceptId,
      transitions: new Map(),
      epsilonTransitions: new Set(),
    };

    // Validation
    if (!startState.transitions || !(startState.transitions instanceof Map)) throw new Error('Invalid transitions in start state');
    if (!startState.epsilonTransitions || !(startState.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in start state');
    if (!acceptState.transitions || !(acceptState.transitions instanceof Map)) throw new Error('Invalid transitions in accept state');
    if (!acceptState.epsilonTransitions || !(acceptState.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in accept state');

    const fragment = {
      start: startId,
      accept: acceptId,
      states: [startState, acceptState],
    };

    this.addStep('Symbol', `Create fragment for symbol '${symbol}'`, fragment.states.map(s => s.id));

    return fragment;
  }

  private concatenation(frag1: Fragment, frag2: Fragment): Fragment {
    if (!frag1.states || !Array.isArray(frag1.states)) throw new Error('Invalid frag1 states');
    if (!frag2.states || !Array.isArray(frag2.states)) throw new Error('Invalid frag2 states');

    const state = frag1.states.find((s: State) => s.id === frag1.accept);
    if (!state) throw new Error(`Accept state ${frag1.accept} not found in frag1`);
    if (!state.epsilonTransitions || !(state.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in frag1 accept state');
    state.epsilonTransitions.add(frag2.start);

    const fragment = {
      start: frag1.start,
      accept: frag2.accept,
      states: [...frag1.states, ...frag2.states],
    };

    this.addStep('Concatenation', `Concatenate fragments`, fragment.states.map(s => s.id));

    return fragment;
  }

  private union(frag1: Fragment, frag2: Fragment): Fragment {
    if (!frag1.states || !Array.isArray(frag1.states)) throw new Error('Invalid frag1 states');
    if (!frag2.states || !Array.isArray(frag2.states)) throw new Error('Invalid frag2 states');

    const newStartId = this.newStateId();
    const newAcceptId = this.newStateId();

    const newStart: State = {
      id: newStartId,
      transitions: new Map(),
      epsilonTransitions: new Set([frag1.start, frag2.start]),
    };

    const newAccept: State = {
      id: newAcceptId,
      transitions: new Map(),
      epsilonTransitions: new Set(),
    };

    // Validation
    if (!newStart.transitions || !(newStart.transitions instanceof Map)) throw new Error('Invalid transitions in new start state');
    if (!newStart.epsilonTransitions || !(newStart.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in new start state');
    if (!newAccept.transitions || !(newAccept.transitions instanceof Map)) throw new Error('Invalid transitions in new accept state');
    if (!newAccept.epsilonTransitions || !(newAccept.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in new accept state');

    // Connect frag1.accept and frag2.accept to newAccept via epsilon
    const state1 = frag1.states.find((s: State) => s.id === frag1.accept);
    if (!state1) throw new Error(`Accept state ${frag1.accept} not found in frag1`);
    if (!state1.epsilonTransitions || !(state1.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in frag1 accept state');
    state1.epsilonTransitions.add(newAcceptId);

    const state2 = frag2.states.find((s: State) => s.id === frag2.accept);
    if (!state2) throw new Error(`Accept state ${frag2.accept} not found in frag2`);
    if (!state2.epsilonTransitions || !(state2.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in frag2 accept state');
    state2.epsilonTransitions.add(newAcceptId);

    const fragment = {
      start: newStartId,
      accept: newAcceptId,
      states: [newStart, newAccept, ...frag1.states, ...frag2.states],
    };

    this.addStep('Union', `Union of two fragments`, fragment.states.map(s => s.id));

    return fragment;
  }

  private kleeneStar(frag: Fragment): Fragment {
    if (!frag.states || !Array.isArray(frag.states)) throw new Error('Invalid frag states');

    const newStartId = this.newStateId();
    const newAcceptId = this.newStateId();

    const newStart: State = {
      id: newStartId,
      transitions: new Map(),
      epsilonTransitions: new Set([frag.start, newAcceptId]), // epsilon to frag.start and directly to accept
    };

    const newAccept: State = {
      id: newAcceptId,
      transitions: new Map(),
      epsilonTransitions: new Set(),
    };

    // Validation
    if (!newStart.transitions || !(newStart.transitions instanceof Map)) throw new Error('Invalid transitions in new start state');
    if (!newStart.epsilonTransitions || !(newStart.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in new start state');
    if (!newAccept.transitions || !(newAccept.transitions instanceof Map)) throw new Error('Invalid transitions in new accept state');
    if (!newAccept.epsilonTransitions || !(newAccept.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in new accept state');

    // Connect frag.accept back to frag.start and to newAccept via epsilon
    const state = frag.states.find((s: State) => s.id === frag.accept);
    if (!state) throw new Error(`Accept state ${frag.accept} not found in frag`);
    if (!state.epsilonTransitions || !(state.epsilonTransitions instanceof Set)) throw new Error('Invalid epsilonTransitions in frag accept state');
    state.epsilonTransitions.add(frag.start);
    state.epsilonTransitions.add(newAcceptId);

    const fragment = {
      start: newStartId,
      accept: newAcceptId,
      states: [newStart, newAccept, ...frag.states],
    };

    this.addStep('Kleene Star', `Kleene star on fragment`, fragment.states.map(s => s.id));

    return fragment;
  }

  private newStateId(): string {
    return `q${this.stateCounter++}`;
  }

  private addStep(type: string, description: string, fragmentStates: string[]) {
    this.steps.push({
      stepNumber: ++this.stepCounter,
      type,
      description,
      fragmentStates,
    });
  }
}