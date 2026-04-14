import { NextResponse } from "next/server";
import { processRegex, simulateDFA, simulateNFA } from "@/lib/automata";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { regex?: string; input?: string; mode?: "nfa" | "dfa" };
    if (!body || typeof body.regex !== "string" || body.regex.trim() === "") {
      return NextResponse.json({ error: "Field 'regex' is required." }, { status: 400 });
    }
    if (typeof body.input !== "string") {
      return NextResponse.json({ error: "Field 'input' is required." }, { status: 400 });
    }

    const result = processRegex(body.regex.trim());
    const simulation =
      body.mode === "dfa"
        ? simulateDFA(result.dfa, body.input)
        : simulateNFA(result.nfa, body.input);

    return NextResponse.json({ simulation });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
