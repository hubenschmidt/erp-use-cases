// Mock environment variables for tests
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_MODEL = 'gpt-4o-mini';
process.env.SERPAPI_KEY = 'test-serpapi-key';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.SENDGRID_FROM_EMAIL = 'test@example.com';

// Mock OpenAI client
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  route_to_orchestrator: false,
                  response: 'Test response',
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));
