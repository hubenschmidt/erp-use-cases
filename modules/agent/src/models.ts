import { z } from 'zod';

export const WorkerType = {
  SEARCH: 'SEARCH',
  EMAIL: 'EMAIL',
  GENERAL: 'GENERAL',
  ERP: 'ERP',
  NONE: 'NONE',
} as const;

export type WorkerType = (typeof WorkerType)[keyof typeof WorkerType];

export const orchestratorDecisionSchema = z.object({
  worker_type: z.enum(['SEARCH', 'EMAIL', 'GENERAL', 'ERP', 'NONE']),
  task_description: z.string(),
  parameters_json: z.string(),
  success_criteria: z.string(),
});

export type OrchestratorDecision = z.infer<typeof orchestratorDecisionSchema>;

export const evaluatorResultSchema = z.object({
  passed: z.boolean(),
  score: z.number(),
  feedback: z.string(),
  suggestions: z.string(),
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

// Frontline decision schema
export const frontlineDecisionSchema = z.object({
  route_to_orchestrator: z.boolean(),
  response: z.string().optional(),
  reason: z.string().optional(),
});

export type FrontlineDecision = z.infer<typeof frontlineDecisionSchema>;

// ERP operation schema
export const erpOperationSchema = z.object({
  operation: z.string(),
  parameters_json: z.string(),
  explanation: z.string(),
});

export type ERPOperation = z.infer<typeof erpOperationSchema>;

// Email composition schema
export const emailCompositionSchema = z.object({
  to: z.string(),
  subject: z.string(),
  body: z.string(),
});

export type EmailComposition = z.infer<typeof emailCompositionSchema>;

// Generic text response schema (for search/general workers)
export const textResponseSchema = z.object({
  response: z.string(),
});

export type TextResponse = z.infer<typeof textResponseSchema>;

export interface OrchestratorResponse {
  message: string;
  data: unknown | null;
  evaluation: {
    status: 'passed' | 'partial' | 'failed';
    score: number;
    criteria: string;
    feedback: string;
  } | null;
}
