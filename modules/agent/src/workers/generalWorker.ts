import { createAgent } from '../lib/agent.js';
import { WorkerResult } from '../models.js';
import { GENERAL_WORKER_PROMPT } from '../prompts/workers/general.js';

const agent = createAgent({
  name: 'GeneralWorker',
  instructions: GENERAL_WORKER_PROMPT,
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
});

export const executeGeneral = async (
  taskDescription: string,
  _parameters: Record<string, unknown>,
  feedback?: string
): Promise<WorkerResult> => {
  console.log('💬 GENERAL_WORKER: Starting execution');
  console.log(`   Task: ${taskDescription.slice(0, 80)}...`);
  if (feedback) {
    console.log('   With feedback from previous attempt');
  }

  try {
    let context = taskDescription;
    if (feedback) {
      context = `${taskDescription}\n\nPrevious feedback to address: ${feedback}`;
    }

    const result = await agent.run(context);

    console.log('✓ GENERAL_WORKER: Execution complete');
    return {
      success: true,
      output: result.finalOutput,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ GENERAL_WORKER: Failed with error: ${errorMsg}`);
    return {
      success: false,
      output: '',
      error: errorMsg,
    };
  }
};
