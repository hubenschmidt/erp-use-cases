import { createAgent } from './lib/agent.js';
import { EvaluatorResult, evaluatorResultSchema } from './models.js';
import { EVALUATOR_SYSTEM_PROMPT } from './prompts/evaluator.js';

const agent = createAgent<EvaluatorResult>({
  name: 'Evaluator',
  instructions: EVALUATOR_SYSTEM_PROMPT,
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  outputSchema: evaluatorResultSchema,
});

export const evaluate = async (
  workerOutput: string,
  taskDescription: string,
  successCriteria: string
): Promise<EvaluatorResult> => {
  console.log('🔍 EVALUATOR: Starting evaluation');
  console.log(`   Criteria: ${successCriteria.slice(0, 80)}...`);

  const context = `Task Description: ${taskDescription}

Success Criteria: ${successCriteria}

Worker Output:
${workerOutput}

Evaluate this output against the success criteria and provide your assessment.`;

  const result = await agent.run(context);
  const evalResult = result.finalOutput;

  const status = evalResult.passed ? 'PASS' : 'FAIL';
  console.log(`🔍 EVALUATOR: Result = ${status} (score: ${evalResult.score}/100)`);

  return evalResult;
};
