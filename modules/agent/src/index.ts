import 'dotenv/config';
import { startServer } from './server.js';

const PORT = parseInt(process.env.PORT ?? '8000', 10);

startServer(PORT);
