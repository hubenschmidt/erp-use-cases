import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI();

export interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
  outputSchema?: z.ZodSchema;
}

export interface AgentResult<T = string> {
  finalOutput: T;
  raw: OpenAI.Chat.Completions.ChatCompletion;
}

const log = (agent: string, event: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    agent,
    event,
    ...data,
  }));
};

const truncate = (str: string, len: number = 200): string => {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
};

export const createAgent = <T = string>(config: AgentConfig) => {
  const run = async (input: string): Promise<AgentResult<T>> => {
    const startTime = Date.now();

    log(config.name, 'CALL', {
      model: config.model,
      hasSchema: !!config.outputSchema,
      inputLength: input.length,
      inputPreview: truncate(input),
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: config.instructions },
      { role: 'user', content: input },
    ];

    try {
      if (config.outputSchema) {
        const response = await openai.chat.completions.create({
          model: config.model,
          messages,
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content ?? '';
        const parsed = config.outputSchema.parse(JSON.parse(content)) as T;

        const duration = Date.now() - startTime;
        log(config.name, 'RESPONSE', {
          durationMs: duration,
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
          outputPreview: truncate(content),
        });

        return { finalOutput: parsed, raw: response };
      }

      const response = await openai.chat.completions.create({
        model: config.model,
        messages,
      });

      const content = response.choices[0]?.message?.content ?? '';

      const duration = Date.now() - startTime;
      log(config.name, 'RESPONSE', {
        durationMs: duration,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        outputLength: content.length,
        outputPreview: truncate(content),
      });

      return { finalOutput: content as T, raw: response };
    } catch (error) {
      const duration = Date.now() - startTime;
      log(config.name, 'ERROR', {
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const stream = async function* (input: string): AsyncGenerator<string> {
    const startTime = Date.now();

    log(config.name, 'STREAM_START', {
      model: config.model,
      inputLength: input.length,
      inputPreview: truncate(input),
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: config.instructions },
      { role: 'user', content: input },
    ];

    try {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages,
        stream: true,
      });

      let totalChunks = 0;
      let totalLength = 0;

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          totalChunks++;
          totalLength += content.length;
          yield content;
        }
      }

      const duration = Date.now() - startTime;
      log(config.name, 'STREAM_END', {
        durationMs: duration,
        chunks: totalChunks,
        totalLength,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      log(config.name, 'STREAM_ERROR', {
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  log(config.name, 'CREATED', {
    model: config.model,
    hasSchema: !!config.outputSchema,
    instructionsLength: config.instructions.length,
  });

  return { run, stream, config };
};

export type Agent<T = string> = ReturnType<typeof createAgent<T>>;
