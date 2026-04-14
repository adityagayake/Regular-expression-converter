import cors from "cors";
import express from "express";
import { RegexParser } from "./parser.js";
import { ThompsonConstruction } from "./thompson.js";
import { DFAConversion } from "./dfa.js";
import { Simulator } from "./simulator.js";
import { Automaton, AutomatonOutput, SimulationResult } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "regex-converter-backend" });
});

function automatonToOutput(automaton: Automaton): AutomatonOutput {
  const transitions: AutomatonOutput['transitions'] = [];
  for (const state of automaton.states) {
    for (const [symbol, targets] of state.transitions) {
      for (const target of targets) {
        transitions.push({ from: state.id, to: target, symbol });
      }
    }
    for (const target of state.epsilonTransitions) {
      transitions.push({ from: state.id, to: target, symbol: 'ε' });
    }
  }
  return {
    states: automaton.states.map(s => s.id),
    start: automaton.start,
    accept: automaton.accept,
    transitions,
  };
}

app.post("/convert", (req, res) => {
  try {
    const { regex, includeDfa } = req.body as { regex: string; includeDfa?: boolean };
    if (typeof regex !== "string") {
      res.status(400).json({ error: "Field 'regex' is required." });
      return;
    }

    const postfix = RegexParser.parse(regex);
    const thompson = new ThompsonConstruction();
    const { automaton: nfa, steps } = thompson.buildNFA(postfix);

    const result: any = { nfa: automatonToOutput(nfa), steps };
    if (includeDfa) {
      const dfa = DFAConversion.convertToDFA(nfa);
      result.dfa = automatonToOutput(dfa);
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post("/simulate", (req, res) => {
  try {
    const { regex, input, mode } = req.body as { regex: string; input: string; mode: 'nfa' | 'dfa' };
    if (typeof regex !== "string" || typeof input !== "string") {
      res.status(400).json({ error: "Fields 'regex' and 'input' are required." });
      return;
    }
    if (mode !== 'nfa' && mode !== 'dfa') {
      res.status(400).json({ error: "Mode must be 'nfa' or 'dfa'." });
      return;
    }

    const result = Simulator.simulate(regex, input, mode);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Keep old endpoint for compatibility
app.post("/api/process", (req, res) => {
  const { regex, input } = req.body as { regex?: string; input?: string };
  if (typeof regex !== "string") {
    res.status(400).json({ error: "Field 'regex' is required." });
    return;
  }
  // Simple simulation for old endpoint
  try {
    const result = Simulator.simulate(regex, input || '', 'nfa');
    res.json({ accepted: result.accepted, trace: result.trace });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Regex backend listening on http://localhost:${port}`);
});
