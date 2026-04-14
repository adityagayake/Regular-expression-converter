import { NextResponse } from "next/server";
import { processRegex } from "@/lib/automata";
import { minimizeDFA } from "@/lib/minimize";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { regex?: string };
    if (!body || typeof body.regex !== "string" || body.regex.trim() === "") {
      return NextResponse.json({ error: "Field 'regex' is required." }, { status: 400 });
    }

    const result = processRegex(body.regex.trim());
    const minDfa = minimizeDFA(result.dfa);

    return NextResponse.json({
      nfa: {
        startState: result.nfa.startState,
        acceptState: result.nfa.acceptState,
        alphabet: result.nfa.alphabet,
        states: result.nfa.states.map((s) => ({
          id: s.id,
          isStart: s.isStart,
          isAccept: s.isAccept,
          transitions: { ...s.transitions },
        })),
        transitions: result.nfa.transitions.map((t) => ({ ...t })),
      },
      dfa: {
        startState: result.dfa.startState,
        acceptStates: result.dfa.acceptStates,
        alphabet: result.dfa.alphabet,
        states: result.dfa.states.map((s) => ({
          id: s.id,
          isStart: s.isStart,
          isAccept: s.isAccept,
          nfaStates: [...s.nfaStates],
        })),
        transitions: result.dfa.transitions.map((t) => ({ ...t })),
      },
      minDfa: {
        startState: minDfa.startState,
        acceptStates: minDfa.acceptStates,
        alphabet: minDfa.alphabet,
        mapping: minDfa.mapping,
        states: minDfa.states.map((s) => ({ ...s })),
        transitions: minDfa.transitions.map((t) => ({ ...t })),
      },
      steps: result.steps.map((step) => ({
        ...step,
        fragmentTransitions: step.fragmentTransitions.map((t) => ({ ...t })),
        newEdges: step.newEdges.map((t) => ({ ...t })),
        newNodeIds: [...step.newNodeIds],
      })),
      simulation: result.simulation,
      explicitRegex: result.explicitRegex,
      postfix: result.postfix,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
