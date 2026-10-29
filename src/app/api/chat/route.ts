import { createAgentUIStreamResponse } from "ai";
import { createTasteTripAgent } from "@/agent/tastetrip";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages } = await request.json();
  return createAgentUIStreamResponse({
    agent: createTasteTripAgent(),
    uiMessages: messages.slice(-20),
  });
}
