import type { ProcessRegexResult } from "./thompson";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export async function processRegexViaBackend(regex: string, input?: string): Promise<ProcessRegexResult> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regex, input }),
  });

  const payload = (await response.json()) as ProcessRegexResult;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Backend processing failed");
  }
  return payload;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
