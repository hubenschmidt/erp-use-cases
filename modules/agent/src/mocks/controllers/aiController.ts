import { Request, Response } from 'express';
import { process as frontlineProcess } from '../../frontline.js';
import { process as orchestratorProcess } from '../../orchestrator.js';
import { Message, OrchestratorResponse } from '../../models.js';

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

interface QueryResponse {
  success: boolean;
  message: string;
  data: unknown | null;
  evaluation: OrchestratorResponse['evaluation'];
  session_id: string;
  routed_to_orchestrator: boolean;
}

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

    const [shouldRoute, frontlineResult] = await frontlineProcess(query, conversation);

    if (!shouldRoute) {
      console.log('[AI Controller] Frontline handled directly');
      conversation.push({ role: 'assistant', content: frontlineResult });

      const result_response: QueryResponse = {
        success: true,
        message: frontlineResult,
        data: null,
        evaluation: null,
        session_id: sessionId,
        routed_to_orchestrator: false,
      };

      res.json(result_response);
      return;
    }

    console.log('[AI Controller] Routing to orchestrator');
    const orchestratorResult = await orchestratorProcess(query, conversation);

    conversation.push({ role: 'assistant', content: orchestratorResult.message });

    const result_response: QueryResponse = {
      success: true,
      message: orchestratorResult.message,
      data: orchestratorResult.data,
      evaluation: orchestratorResult.evaluation,
      session_id: sessionId,
      routed_to_orchestrator: true,
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
