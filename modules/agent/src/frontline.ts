import { createAgent } from "./lib/agent.js";
import { Message } from "./models.js";
import { FRONTLINE_SYSTEM_PROMPT } from "./prompts/frontline.js";
import { models } from "./llm-models/index.js";

const agent = createAgent({
  name: "Frontline",
  instructions: FRONTLINE_SYSTEM_PROMPT,
  model: models.frontline,
});

interface FrontlineDecision {
  route_to_orchestrator: boolean;
  response?: string;
  reason?: string;
}

export const process = async (
  userInput: string,
  conversationHistory: Message[]
): Promise<[boolean, string]> => {
  console.log("⚡ FRONTLINE: Processing request");
  console.log(`   Input: ${userInput.slice(0, 80)}...`);

  const recent = conversationHistory.slice(-4);
  const historyContext = recent
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const context = `Recent conversation:
${historyContext}

Current user message: ${userInput}

Decide whether to handle this directly or route to the orchestrator.`;

  const result = await agent.run(context);
  const responseText = result.finalOutput.trim();

  return parseDecision(responseText, result.finalOutput);
};

const parseDecision = (
  responseText: string,
  fallback: string
): [boolean, string] => {
  let text = responseText;

  if (text.startsWith("```")) {
    text = text.split("```")[1];
    if (text.startsWith("json")) {
      text = text.slice(4);
    }
  }

  try {
    const decision: FrontlineDecision = JSON.parse(text);

    if (decision.route_to_orchestrator) {
      const reason = decision.reason ?? "Specialized task detected";
      console.log(`→ FRONTLINE: Routing to orchestrator (${reason})`);
      return [true, reason];
    }

    console.log("✓ FRONTLINE: Handled directly");
    return [false, decision.response ?? ""];
  } catch {
    console.warn("⚠️  FRONTLINE: Failed to parse response, handling as direct");
    return [false, fallback];
  }
};
