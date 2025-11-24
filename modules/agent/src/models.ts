import { z } from 'zod';

export const WorkerType = {
  SEARCH: 'SEARCH',
  EMAIL: 'EMAIL',
  GENERAL: 'GENERAL',
  NONE: 'NONE',
} as const;

export type WorkerType = (typeof WorkerType)[keyof typeof WorkerType];

export const orchestratorDecisionSchema = z.object({
  worker_type: z.enum(['SEARCH', 'EMAIL', 'GENERAL', 'NONE']),
  task_description: z.string(),
  parameters: z.record(z.unknown()),
  success_criteria: z.string(),
});

export type OrchestratorDecision = z.infer<typeof orchestratorDecisionSchema>;

export const evaluatorResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  feedback: z.string(),
  suggestions: z.string().default(''),
});

export type EvaluatorResult = z.infer<typeof evaluatorResultSchema>;

export const workerResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  error: z.string().nullable().default(null),
});

export type WorkerResult = z.infer<typeof workerResultSchema>;

export const emailParamsSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
});

export type EmailParams = z.infer<typeof emailParamsSchema>;

export const searchParamsSchema = z.object({
  query: z.string(),
  num_results: z.number().int().default(5),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
