import { Request, Response } from 'express';
import { process as frontlineProcess } from '../../frontline.js';
import { process as orchestratorProcess } from '../../orchestrator.js';
import { Message } from '../../models.js';

const sessions = new Map<string, Message[]>();

const getSession = (sessionId: string): Message[] => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId)!;
};

interface QueryRequest {
  query: string;
  session_id?: string;
}

interface EvaluationInfo {
  status: string;
  score: number;
  criteria: string;
  feedback: string;
}

interface QueryResponse {
  success: boolean;
  message: string;
  data: unknown | null;
  evaluation: EvaluationInfo | null;
  session_id: string;
  routed_to_orchestrator: boolean;
}

interface ParsedResponse {
  message: string;
  data: unknown | null;
  evaluation: EvaluationInfo | null;
}

const extractEvaluation = (response: string): { evaluation: EvaluationInfo | null; remaining: string } => {
  const evalMatch = response.match(/\n\n\[Evaluation: (\w+) \| Score: (\d+)\/100\]\n\[Criteria: (.+?)\]\n\[Feedback: (.+)\]$/s);
  if (evalMatch) {
    return {
      evaluation: {
        status: evalMatch[1],
        score: parseInt(evalMatch[2], 10),
        criteria: evalMatch[3].trim(),
        feedback: evalMatch[4].trim(),
      },
      remaining: response.slice(0, evalMatch.index),
    };
  }

  const noteMatch = response.match(/\n\n\[Note: (.+)\]$/s);
  if (noteMatch) {
    return {
      evaluation: {
        status: 'partial',
        score: 0,
        criteria: '',
        feedback: noteMatch[1].trim(),
      },
      remaining: response.slice(0, noteMatch.index),
    };
  }

  return { evaluation: null, remaining: response };
};

const extractData = (response: string): { message: string; data: unknown | null } => {
  const resultMatch = response.match(/^(.*?)\n\nResult:\n(.+)$/s);
  if (!resultMatch) {
    return { message: response, data: null };
  }

  const message = resultMatch[1].trim();
  const jsonStr = resultMatch[2].trim();

  try {
    return { message, data: JSON.parse(jsonStr) };
  } catch {
    return { message: response, data: null };
  }
};

const parseResponse = (response: string): ParsedResponse => {
  const { evaluation, remaining } = extractEvaluation(response);
  const { message, data } = extractData(remaining);
  return { message, data, evaluation };
};

export const query = async (req: Request, res: Response) => {
  const { query, session_id } = req.body as QueryRequest;

  if (!query) {
    res.status(400).json({ error: 'Query is required' });
    return;
  }

  if (!globalThis.process?.env?.OPENAI_API_KEY) {
    res.status(503).json({ error: 'OPENAI_API_KEY is not configured' });
    return;
  }

  const sessionId = session_id || `rest-${Date.now()}`;
  const conversation = getSession(sessionId);
  conversation.push({ role: 'user', content: query });

  try {
    console.log(`[AI Controller] Processing query: ${query.slice(0, 80)}...`);

    const [shouldRoute, result] = await frontlineProcess(query, conversation);

    const routedToOrchestrator = shouldRoute;

    if (!shouldRoute) {
      console.log('[AI Controller] Frontline handled directly');
    }
    if (shouldRoute) {
      console.log('[AI Controller] Routing to orchestrator');
    }

    const response = shouldRoute
      ? await orchestratorProcess(query, conversation)
      : result;

    conversation.push({ role: 'assistant', content: response });

    const { message, data, evaluation } = parseResponse(response);

    const result_response: QueryResponse = {
      success: true,
      message,
      data,
      evaluation,
      session_id: sessionId,
      routed_to_orchestrator: routedToOrchestrator,
    };

    res.json(result_response);
  } catch (error) {
    console.error('[AI Controller] Error:', error);

    const isZodError = error && typeof error === 'object' && 'issues' in error;

    const errorDetails = isZodError
      ? (error as { issues: Array<{ path: string[]; message: string }> }).issues
      : null;

    const errorMsg = isZodError
      ? (error as { issues: Array<{ path: string[]; message: string }> }).issues
          .map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      : error instanceof Error ? error.message : String(error);

    res.status(500).json({
      success: false,
      error: errorMsg,
      error_details: errorDetails,
      session_id: sessionId,
    });
  }
};

export const clearSession = (req: Request, res: Response) => {
  const { sessionId } = req.params;

  if (!sessions.has(sessionId)) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }

  sessions.delete(sessionId);
  res.json({ success: true, message: `Session ${sessionId} cleared` });
};
