import {
  WorkerType,
  orchestratorDecisionSchema,
  evaluatorResultSchema,
  workerResultSchema,
  emailParamsSchema,
  searchParamsSchema,
} from '../../src/models.js';

describe('WorkerType', () => {
  it('should have correct values', () => {
    expect(WorkerType.SEARCH).toBe('SEARCH');
    expect(WorkerType.EMAIL).toBe('EMAIL');
    expect(WorkerType.GENERAL).toBe('GENERAL');
    expect(WorkerType.NONE).toBe('NONE');
  });
});

describe('orchestratorDecisionSchema', () => {
  it('should validate correct decision', () => {
    const decision = {
      worker_type: 'SEARCH',
      task_description: 'Find information',
      parameters: { query: 'test' },
      success_criteria: 'Return relevant results',
    };

    const result = orchestratorDecisionSchema.parse(decision);
    expect(result.worker_type).toBe('SEARCH');
  });

  it('should reject invalid worker type', () => {
    const decision = {
      worker_type: 'INVALID',
      task_description: 'Test',
      parameters: {},
      success_criteria: 'Test',
    };

    expect(() => orchestratorDecisionSchema.parse(decision)).toThrow();
  });
});

describe('evaluatorResultSchema', () => {
  it('should validate correct result', () => {
    const result = {
      passed: true,
      score: 85,
      feedback: 'Good work',
      suggestions: '',
    };

    const parsed = evaluatorResultSchema.parse(result);
    expect(parsed.passed).toBe(true);
    expect(parsed.score).toBe(85);
  });

  it('should reject score out of range', () => {
    const result = {
      passed: true,
      score: 150,
      feedback: 'Test',
    };

    expect(() => evaluatorResultSchema.parse(result)).toThrow();
  });
});

describe('workerResultSchema', () => {
  it('should validate success result', () => {
    const result = {
      success: true,
      output: 'Task completed',
      error: null,
    };

    const parsed = workerResultSchema.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('should validate error result', () => {
    const result = {
      success: false,
      output: '',
      error: 'Something went wrong',
    };

    const parsed = workerResultSchema.parse(result);
    expect(parsed.error).toBe('Something went wrong');
  });
});

describe('emailParamsSchema', () => {
  it('should validate email params', () => {
    const params = {
      to: 'user@example.com',
      subject: 'Test Subject',
      body: 'Test body content',
    };

    const parsed = emailParamsSchema.parse(params);
    expect(parsed.to).toBe('user@example.com');
  });
});

describe('searchParamsSchema', () => {
  it('should validate search params with defaults', () => {
    const params = {
      query: 'test query',
    };

    const parsed = searchParamsSchema.parse(params);
    expect(parsed.query).toBe('test query');
    expect(parsed.num_results).toBe(5);
  });

  it('should accept custom num_results', () => {
    const params = {
      query: 'test',
      num_results: 10,
    };

    const parsed = searchParamsSchema.parse(params);
    expect(parsed.num_results).toBe(10);
  });
});
