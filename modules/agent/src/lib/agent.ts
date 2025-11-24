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

export const createAgent = <T = string>(config: AgentConfig) => {
  const run = async (input: string): Promise<AgentResult<T>> => {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: config.instructions },
      { role: 'user', content: input },
    ];

    if (config.outputSchema) {
      const response = await openai.chat.completions.create({
        model: config.model,
        messages,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content ?? '';
      const parsed = config.outputSchema.parse(JSON.parse(content)) as T;

      return { finalOutput: parsed, raw: response };
    }

    const response = await openai.chat.completions.create({
      model: config.model,
      messages,
    });

    const content = response.choices[0]?.message?.content ?? '';
    return { finalOutput: content as T, raw: response };
  };

  const stream = async function* (input: string): AsyncGenerator<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: config.instructions },
      { role: 'user', content: input },
    ];

    const response = await openai.chat.completions.create({
      model: config.model,
      messages,
      stream: true,
    });

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  };

  return { run, stream, config };
};

export type Agent<T = string> = ReturnType<typeof createAgent<T>>;
