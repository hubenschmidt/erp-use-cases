import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { handleChat } from './runner.js';
import { inventoryRouter, orderRouter, reportRouter, aiRouter, forecastRouter } from './mocks/routes/index.js';

const app = express();
app.use(express.json());

// Register API routers
app.use('/api', inventoryRouter);
app.use('/api', orderRouter);
app.use('/api', reportRouter);
app.use('/api', aiRouter);
app.use('/api', forecastRouter);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

import { Message } from './models.js';

interface Payload {
  init?: boolean;
  uuid?: string;
  message?: string | Message[];
}

const log = (uuid: string | null, op: string, data?: unknown) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      uuid,
      op,
      ...(data ? { data } : {}),
    })
  );
};

wss.on('connection', (ws: WebSocket) => {
  let userUuid: string | null = null;

  const handleFrame = async (raw: string): Promise<void> => {
    let payload: Payload;

    try {
      payload = JSON.parse(raw);
    } catch (error) {
      log(userUuid, `JSON encoding error - ${error}`);
      return;
    }

    log(userUuid, 'received', payload);

    userUuid = payload.uuid ?? userUuid;

    if (payload.init) {
      log(userUuid, 'Initializing ws with client.');
      return;
    }

    const message = payload.message;
    if (!message) return;

    await handleChat(ws, message, userUuid ?? 'anonymous');
  };

  ws.on('message', (data) => {
    handleFrame(data.toString()).catch((error) => {
      log(userUuid, `Error: ${error}`);
    });
  });

  ws.on('close', () => {
    if (userUuid) {
      log(userUuid, 'Closing connection.');
    }
  });

  ws.on('error', (error) => {
    log(userUuid, `WebSocket error: ${error}`);
  });
});

export const startServer = (port: number = 8000) => {
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
};

export { app, server };
