import { createAgent } from "./lib/agent.js";
import {
  Message,
  OrchestratorDecision,
  WorkerType,
  orchestratorDecisionSchema,
} from "./models.js";
import { ORCHESTRATOR_SYSTEM_PROMPT } from "./prompts/orchestrator.js";
import { evaluate } from "./evaluator.js";
import { executeWorker } from "./workers/index.js";
import { models } from "./llm-models/index.js";

const MAX_RETRIES = 5;

const agent = createAgent<OrchestratorDecision>({
  name: "Orchestrator",
  instructions: ORCHESTRATOR_SYSTEM_PROMPT,
  model: models.orchestrator,
  outputSchema: orchestratorDecisionSchema,
});

export const process = async (
  userInput: string,
  conversationHistory: Message[]
): Promise<string> => {
  console.log("=".repeat(50));
  console.log("▶️  ORCHESTRATOR: Starting request processing");
  console.log(`   User input: ${userInput.slice(0, 100)}...`);

  const decision = await route(userInput, conversationHistory);

  console.log(`→ ORCHESTRATOR: Routing to ${decision.worker_type}`);
  console.log(`   Task: ${decision.task_description.slice(0, 100)}...`);
  console.log(
    `   Success criteria: ${decision.success_criteria.slice(0, 100)}...`
  );

  if (decision.worker_type === WorkerType.NONE) {
    console.warn("⚠️  ORCHESTRATOR: No suitable worker found");
    return `I'm unable to help with that request. ${decision.task_description}`;
  }

  return executeWithEvaluation(decision);
};

const executeWithEvaluation = async (
  decision: OrchestratorDecision
): Promise<string> => {
  let feedback: string | undefined;
  let workerResult = {
    success: false,
    output: "",
    error: null as string | null,
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`🔄 ORCHESTRATOR: Attempt ${attempt + 1}/${MAX_RETRIES}`);

    const workerStart = Date.now();
    workerResult = await executeWorker(
      decision.worker_type as WorkerType,
      decision.task_description,
      decision.parameters,
      feedback
    );
    const workerDuration = Date.now() - workerStart;

    if (!workerResult.success) {
      console.error(`❌ WORKER: Failed with error: ${workerResult.error}`);
      return `Error: ${workerResult.error}`;
    }

    console.log(`✓ WORKER: Completed successfully (${workerDuration}ms)`);

    const evalStart = Date.now();
    const evalResult = await evaluate(
      workerResult.output,
      decision.task_description,
      decision.success_criteria
    );
    const evalDuration = Date.now() - evalStart;

    console.log(
      `${evalResult.passed ? "✅" : "⚠️ "} EVALUATOR: ${
        evalResult.passed ? "Passed" : "Failed"
      } (score: ${evalResult.score}/100) (${evalDuration}ms)`
    );
    console.log(`   Feedback: ${evalResult.feedback.slice(0, 150)}...`);

    if (evalResult.passed) {
      console.log("=".repeat(50));
      return formatResponse(
        workerResult.output,
        decision.success_criteria,
        evalResult
      );
    }

    feedback = `${evalResult.feedback}\n\nSuggestions: ${evalResult.suggestions}`;

    if (attempt === MAX_RETRIES - 1) {
      console.warn(
        "⚠️  ORCHESTRATOR: Max retries reached, returning partial result"
      );
      console.log("=".repeat(50));
      return formatResponse(
        workerResult.output,
        decision.success_criteria,
        evalResult,
        true
      );
    }
  }

  return workerResult.output;
};

const formatResponse = (
  output: string,
  successCriteria: string,
  evalResult: { passed: boolean; score: number; feedback: string },
  maxRetriesReached = false
): string => {
  const status = maxRetriesReached
    ? "partial"
    : evalResult.passed
    ? "passed"
    : "failed";
  return `${output}\n\n[Evaluation: ${status} | Score: ${evalResult.score}/100]\n[Criteria: ${successCriteria}]\n[Feedback: ${evalResult.feedback}]`;
};

const route = async (
  userInput: string,
  conversationHistory: Message[]
): Promise<OrchestratorDecision> => {
  const recent = conversationHistory.slice(-6);
  const historyContext = recent
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const context = `Conversation History:
${historyContext}

Current User Request: ${userInput}

Analyze this request and determine which worker should handle it.`;

  const result = await agent.run(context);
  return result.finalOutput;
};
