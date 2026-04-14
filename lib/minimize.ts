// minimize.ts — Hopcroft partition-refinement DFA minimization
// Does NOT touch NFA logic. Input/output use the same DFA type from automata.ts

import type { DFA, DFAState, Transition } from "./automata";

export interface MinDFAState {
  id: string;           // M0, M1, …
  dfaStates: string[];  // original DFA state ids in this partition
  isStart: boolean;
  isAccept: boolean;
}

export interface MinDFA {
  states: MinDFAState[];
  transitions: Transition[];
  startState: string;
  acceptStates: string[];
  alphabet: string[];
  // mapping for display: "M0 = {D0, D2}"
  mapping: Record<string, string[]>;
}

// ─── Step 0: remove unreachable states ───────────────────────────────────────
function reachableStates(dfa: DFA): Set<string> {
  const visited = new Set<string>();
  const queue = [dfa.startState];
  visited.add(dfa.startState);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const t of dfa.transitions) {
      if (String(t.from) === cur && !visited.has(String(t.to))) {
        visited.add(String(t.to));
        queue.push(String(t.to));
      }
    }
  }
  return visited;
}

// ─── Main minimization ────────────────────────────────────────────────────────
export function minimizeDFA(dfa: DFA): MinDFA {
  const alphabet = dfa.alphabet.filter((s) => s !== "ε");

  // Step 0 — keep only reachable states
  const reachable = reachableStates(dfa);
  const states = dfa.states.filter((s) => reachable.has(s.id));
  const transitions = dfa.transitions.filter(
    (t) => reachable.has(String(t.from)) && reachable.has(String(t.to))
  );

  // Build fast transition lookup: stateId -> symbol -> targetId
  const trans: Record<string, Record<string, string>> = {};
  for (const s of states) trans[s.id] = {};
  for (const t of transitions) {
    trans[String(t.from)][t.symbol] = String(t.to);
  }

  // Step 1 — initial partition: accepting vs non-accepting
  const accepting = new Set(states.filter((s) => s.isAccept).map((s) => s.id));
  const nonAccepting = new Set(states.filter((s) => !s.isAccept).map((s) => s.id));

  // Partitions as arrays of sets
  let partitions: Set<string>[] = [];
  if (accepting.size > 0) partitions.push(accepting);
  if (nonAccepting.size > 0) partitions.push(nonAccepting);

  // Map each state to its partition index
  const partitionOf = (stateId: string): number => {
    for (let i = 0; i < partitions.length; i++) {
      if (partitions[i].has(stateId)) return i;
    }
    return -1;
  };

  // Step 2 — refinement loop
  let changed = true;
  while (changed) {
    changed = false;
    const newPartitions: Set<string>[] = [];

    for (const group of partitions) {
      if (group.size <= 1) {
        newPartitions.push(group);
        continue;
      }

      // Try to split this group by each symbol
      // Two states are distinguishable if they transition to different partitions
      const members = [...group];
      const subgroups: Set<string>[] = [];

      for (const stateId of members) {
        let placed = false;
        for (const sub of subgroups) {
          const rep = [...sub][0];
          let equivalent = true;
          for (const sym of alphabet) {
            const tA = trans[stateId]?.[sym];
            const tB = trans[rep]?.[sym];
            // Both undefined (no transition) → same
            if (tA === undefined && tB === undefined) continue;
            // One undefined → different
            if (tA === undefined || tB === undefined) { equivalent = false; break; }
            // Both defined but go to different partitions → different
            if (partitionOf(tA) !== partitionOf(tB)) { equivalent = false; break; }
          }
          if (equivalent) {
            sub.add(stateId);
            placed = true;
            break;
          }
        }
        if (!placed) subgroups.push(new Set([stateId]));
      }

      if (subgroups.length > 1) changed = true;
      newPartitions.push(...subgroups);
    }

    partitions = newPartitions;
  }

  // Step 3 — build minimized DFA
  // Assign stable IDs: partition containing start state → M0
  const startPartIdx = partitions.findIndex((p) =>
    [...p].some((id) => id === dfa.startState)
  );
  // Reorder so start partition is first
  if (startPartIdx > 0) {
    const tmp = partitions[0];
    partitions[0] = partitions[startPartIdx];
    partitions[startPartIdx] = tmp;
  }

  const partId = (idx: number) => `M${idx}`;

  // Map original state → new partition id
  const stateToPartId: Record<string, string> = {};
  for (let i = 0; i < partitions.length; i++) {
    for (const s of partitions[i]) stateToPartId[s] = partId(i);
  }

  const minStates: MinDFAState[] = partitions.map((part, i) => {
    const members = [...part];
    const isAccept = members.some((id) => accepting.has(id));
    const isStart = members.some((id) => id === dfa.startState);
    return { id: partId(i), dfaStates: members.sort(), isStart, isAccept };
  });

  // Build transitions (deduplicated)
  const minTransSet = new Set<string>();
  const minTransitions: Transition[] = [];
  for (let i = 0; i < partitions.length; i++) {
    const rep = [...partitions[i]][0]; // representative state
    for (const sym of alphabet) {
      const target = trans[rep]?.[sym];
      if (target === undefined) continue;
      const targetPartId = stateToPartId[target];
      const key = `${partId(i)}__${sym}__${targetPartId}`;
      if (!minTransSet.has(key)) {
        minTransSet.add(key);
        minTransitions.push({
          from: partId(i) as unknown as number,
          to: targetPartId as unknown as number,
          symbol: sym,
        });
      }
    }
  }

  const startId = stateToPartId[dfa.startState];
  const acceptIds = minStates.filter((s) => s.isAccept).map((s) => s.id);

  const mapping: Record<string, string[]> = {};
  for (const s of minStates) mapping[s.id] = s.dfaStates;

  return {
    states: minStates,
    transitions: minTransitions,
    startState: startId,
    acceptStates: acceptIds,
    alphabet,
    mapping,
  };
}
