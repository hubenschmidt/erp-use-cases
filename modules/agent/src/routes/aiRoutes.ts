import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';

export const aiRouter = Router();

aiRouter.post('/ai/query', aiController.query);
aiRouter.delete('/ai/session/:sessionId', aiController.clearSession);
