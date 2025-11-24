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

const parseResponse = (response: string): ParsedResponse => {
  let message = response;
  let data: unknown | null = null;
  let evaluation: EvaluationInfo | null = null;

  // Extract evaluation metadata if present
  const evalMatch = response.match(/\n\n\[Evaluation: (\w+) \| Score: (\d+)\/100\]\n\[Criteria: (.+?)\]\n\[Feedback: (.+)\]$/s);
  if (evalMatch) {
    evaluation = {
      status: evalMatch[1],
      score: parseInt(evalMatch[2], 10),
      criteria: evalMatch[3].trim(),
      feedback: evalMatch[4].trim(),
    };
    response = response.slice(0, evalMatch.index);
  }

  // Also handle old format for backwards compatibility
  if (!evaluation) {
    const noteMatch = response.match(/\n\n\[Note: (.+)\]$/s);
    if (noteMatch) {
      evaluation = {
        status: 'partial',
        score: 0,
        criteria: '',
        feedback: noteMatch[1].trim(),
      };
      response = response.slice(0, noteMatch.index);
    }
  }

  // Extract message and JSON result
  const resultMatch = response.match(/^(.*?)\n\nResult:\n(.+)$/s);

  if (resultMatch) {
    message = resultMatch[1].trim();
    const jsonStr = resultMatch[2].trim();

    try {
      data = JSON.parse(jsonStr);
    } catch {
      // If JSON parse fails, include it in message
      message = response;
    }
  }

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

    let response: string;
    let routedToOrchestrator = false;

    if (!shouldRoute) {
      console.log('[AI Controller] Frontline handled directly');
      response = result;
    } else {
      console.log('[AI Controller] Routing to orchestrator');
      routedToOrchestrator = true;
      response = await orchestratorProcess(query, conversation);
    }

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

    let errorMsg: string;
    let errorDetails: unknown = null;

    if (error && typeof error === 'object' && 'issues' in error) {
      // ZodError - format nicely
      const zodError = error as { issues: Array<{ path: string[]; message: string }> };
      errorMsg = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      errorDetails = zodError.issues;
    } else {
      errorMsg = error instanceof Error ? error.message : String(error);
    }

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

  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    res.json({ success: true, message: `Session ${sessionId} cleared` });
  } else {
    res.status(404).json({ success: false, error: 'Session not found' });
  }
};
