import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WorkerConfig {
  model: string;
  description: string;
}

interface ModelConfig {
  frontline: WorkerConfig;
  orchestrator: WorkerConfig;
  evaluator: WorkerConfig;
  workers: {
    erp: WorkerConfig;
    search: WorkerConfig;
    email: WorkerConfig;
    general: WorkerConfig;
  };
}

const configPath = join(__dirname, 'modelConfig.json');
const config: ModelConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

export const models = {
  frontline: config.frontline.model,
  orchestrator: config.orchestrator.model,
  evaluator: config.evaluator.model,
  workers: {
    erp: config.workers.erp.model,
    search: config.workers.search.model,
    email: config.workers.email.model,
    general: config.workers.general.model,
  },
};

export { config as modelConfig };
