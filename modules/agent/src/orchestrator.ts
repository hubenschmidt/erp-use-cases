import { createAgent } from './lib/agent.js';
import {
  Message,
  OrchestratorDecision,
  WorkerType,
  orchestratorDecisionSchema,
} from './models.js';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './prompts/orchestrator.js';
import { evaluate } from './evaluator.js';
import { executeWorker } from './workers/index.js';

const MAX_RETRIES = 3;

const model = globalThis.process?.env?.OPENAI_MODEL ?? 'gpt-4o';

const agent = createAgent<OrchestratorDecision>({
  name: 'Orchestrator',
  instructions: ORCHESTRATOR_SYSTEM_PROMPT,
  model,
  outputSchema: orchestratorDecisionSchema,
});

export const process = async (
  userInput: string,
  conversationHistory: Message[]
): Promise<string> => {
  console.log('='.repeat(50));
  console.log('▶️  ORCHESTRATOR: Starting request processing');
  console.log(`   User input: ${userInput.slice(0, 100)}...`);

  const decision = await route(userInput, conversationHistory);

  console.log(`→ ORCHESTRATOR: Routing to ${decision.worker_type}`);
  console.log(`   Task: ${decision.task_description.slice(0, 100)}...`);
  console.log(`   Success criteria: ${decision.success_criteria.slice(0, 100)}...`);

  if (decision.worker_type === WorkerType.NONE) {
    console.warn('⚠️  ORCHESTRATOR: No suitable worker found');
    return `I'm unable to help with that request. ${decision.task_description}`;
  }

  return executeWithEvaluation(decision);
};

const executeWithEvaluation = async (
  decision: OrchestratorDecision
): Promise<string> => {
  let feedback: string | undefined;
  let workerResult = { success: false, output: '', error: null as string | null };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`🔄 ORCHESTRATOR: Attempt ${attempt + 1}/${MAX_RETRIES}`);

    workerResult = await executeWorker(
      decision.worker_type as WorkerType,
      decision.task_description,
      decision.parameters,
      feedback
    );

    if (!workerResult.success) {
      console.error(`❌ WORKER: Failed with error: ${workerResult.error}`);
      return `Error: ${workerResult.error}`;
    }

    console.log('✓ WORKER: Completed successfully');

    const evalResult = await evaluate(
      workerResult.output,
      decision.task_description,
      decision.success_criteria
    );

    if (evalResult.passed) {
      console.log(`✅ EVALUATOR: Passed (score: ${evalResult.score}/100)`);
      console.log('='.repeat(50));
      return workerResult.output;
    }

    console.log(`⚠️  EVALUATOR: Failed (score: ${evalResult.score}/100)`);
    console.log(`   Feedback: ${evalResult.feedback.slice(0, 100)}...`);

    feedback = `${evalResult.feedback}\n\nSuggestions: ${evalResult.suggestions}`;

    if (attempt === MAX_RETRIES - 1) {
      console.warn('⚠️  ORCHESTRATOR: Max retries reached, returning partial result');
      console.log('='.repeat(50));
      return `${workerResult.output}\n\n[Note: Response may not fully meet quality criteria after ${MAX_RETRIES} attempts. Evaluator feedback: ${evalResult.feedback}]`;
    }
  }

  return workerResult.output;
};

const route = async (
  userInput: string,
  conversationHistory: Message[]
): Promise<OrchestratorDecision> => {
  const recent = conversationHistory.slice(-6);
  const historyContext = recent
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const context = `Conversation History:
${historyContext}

Current User Request: ${userInput}

Analyze this request and determine which worker should handle it.`;

  const result = await agent.run(context);
  return result.finalOutput;
};
