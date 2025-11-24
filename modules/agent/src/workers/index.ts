import { WorkerResult, WorkerType } from '../models.js';
import { executeSearch } from './searchWorker.js';
import { executeEmail } from './emailWorker.js';
import { executeGeneral } from './generalWorker.js';

type WorkerFn = (
  taskDescription: string,
  parameters: Record<string, unknown>,
  feedback?: string
) => Promise<WorkerResult>;

const workerRegistry = new Map<WorkerType, WorkerFn>([
  [WorkerType.SEARCH, executeSearch],
  [WorkerType.EMAIL, executeEmail],
  [WorkerType.GENERAL, executeGeneral],
]);

export const executeWorker = async (
  workerType: WorkerType,
  taskDescription: string,
  parameters: Record<string, unknown>,
  feedback?: string
): Promise<WorkerResult> => {
  const workerFn = workerRegistry.get(workerType);

  if (!workerFn) {
    return {
      success: false,
      output: '',
      error: `Worker ${workerType} not available`,
    };
  }

  return workerFn(taskDescription, parameters, feedback);
};
