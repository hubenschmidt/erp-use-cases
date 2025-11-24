import 'dotenv/config';
import { WebSocket } from 'ws';
import { Message } from './models.js';
import { process as frontlineProcess } from './frontline.js';
import { process as orchestratorProcess } from './orchestrator.js';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.warn('OPENAI_API_KEY is missing. Agent will not function until configured.');
}

const conversations = new Map<string, Message[]>();

const getConversation = (userUuid: string): Message[] => {
  if (!conversations.has(userUuid)) {
    conversations.set(userUuid, []);
  }
  return conversations.get(userUuid)!;
};

const extractUserInput = (data: string | Message[]): string => {
  if (typeof data === 'string') {
    return data;
  }

  const userMessages = data.filter((m) => m.role === 'user');
  if (userMessages.length === 0) {
    return '';
  }

  return userMessages[userMessages.length - 1].content;
};

const formatForChat = (response: string): string => {
  // Remove evaluation metadata
  let text = response.replace(/\n\n\[Evaluation:.*?\]\n\[Criteria:.*?\]\n\[Feedback:.*?\]$/s, '');

  // Parse out JSON and convert to readable text
  const resultMatch = text.match(/^(.*?)\n\nResult:\n(.+)$/s);
  if (!resultMatch) {
    return text;
  }

  const [, message, jsonStr] = resultMatch;

  try {
    const data = JSON.parse(jsonStr);
    return `${message}\n\n${formatDataAsText(data)}`;
  } catch {
    return text;
  }
};

const formatDataAsText = (data: unknown): string => {
  if (Array.isArray(data)) {
    if (data.length === 0) return 'No results found.';
    return data.map((item, i) => `${i + 1}. ${formatObject(item)}`).join('\n\n');
  }

  if (typeof data === 'object' && data !== null) {
    return formatObject(data as Record<string, unknown>);
  }

  return String(data);
};

const formatValue = (label: string, value: unknown): string[] => {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
    return [
      `\n${label}:`,
      ...value.map((item, i) => `  ${i + 1}. ${formatObject(item as Record<string, unknown>)}`),
    ];
  }

  if (Array.isArray(value)) {
    return [`${label}: ${value.join(', ')}`];
  }

  if (typeof value === 'object' && value !== null) {
    return [`${label}: ${formatObject(value as Record<string, unknown>)}`];
  }

  return [`${label}: ${value}`];
};

const formatObject = (obj: Record<string, unknown>): string => {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return formatValue(label, value);
    })
    .join('\n');
};

export const handleChat = async (
  websocket: WebSocket,
  data: string | Message[],
  userUuid: string
): Promise<void> => {
  const send = (payload: Record<string, unknown>) => {
    websocket.send(JSON.stringify(payload));
  };

  if (!API_KEY) {
    console.warn('handleChat called without API_KEY configured');
    const errorMsg = 'OPENAI_API_KEY is not configured. Please set it in your environment.';
    send({ on_chat_model_stream: errorMsg });
    send({ on_chat_model_end: true });
    return;
  }

  const userInput = extractUserInput(data);
  if (!userInput) {
    console.warn('Empty user input, skipping');
    return;
  }

  console.log(`Processing message: ${userInput.slice(0, 50)}`);

  const conversation = getConversation(userUuid);
  conversation.push({ role: 'user', content: userInput });

  try {
    const [shouldRoute, result] = await frontlineProcess(userInput, conversation);

    if (!shouldRoute) {
      console.log('Frontline handled directly');
      send({ on_chat_model_stream: result });
      send({ on_chat_model_end: true });
      conversation.push({ role: 'assistant', content: result });
      return;
    }

    console.log('Routing to orchestrator for specialized processing');
    send({ on_chat_model_stream: 'Processing your request...' });

    const response = await orchestratorProcess(userInput, conversation);
    const formattedResponse = formatForChat(response);

    send({ on_chat_model_stream: '\n\n' });
    send({ on_chat_model_stream: formattedResponse });
    send({ on_chat_model_end: true });
    conversation.push({ role: 'assistant', content: formattedResponse });
  } catch (error) {
    console.error('Agent run failed:', error);
    const errorMsg = 'Sorry—there was an error generating the response.';
    send({ on_chat_model_stream: errorMsg });
    send({ on_chat_model_end: true });
    conversation.push({ role: 'assistant', content: errorMsg });
  }
};
