import { createAgent } from '../../src/lib/agent.js';

describe('createAgent', () => {
  it('should create an agent with run method', () => {
    const agent = createAgent({
      name: 'TestAgent',
      instructions: 'You are a test agent',
      model: 'gpt-4o-mini',
    });

    expect(agent).toHaveProperty('run');
    expect(agent).toHaveProperty('stream');
    expect(agent).toHaveProperty('config');
    expect(typeof agent.run).toBe('function');
  });

  it('should store config correctly', () => {
    const config = {
      name: 'TestAgent',
      instructions: 'Test instructions',
      model: 'gpt-4o',
    };

    const agent = createAgent(config);

    expect(agent.config.name).toBe('TestAgent');
    expect(agent.config.instructions).toBe('Test instructions');
    expect(agent.config.model).toBe('gpt-4o');
  });
});

describe('Worker Registry', () => {
  it('should export executeWorker function', async () => {
    const { executeWorker } = await import('../../src/workers/index.js');
    expect(typeof executeWorker).toBe('function');
  });
});

describe('Mocks', () => {
  it('should load inventory service', async () => {
    const inventoryService = await import('../../src/mocks/services/inventoryService.js');
    expect(inventoryService.getStock).toBeDefined();
    expect(inventoryService.getStockBySku).toBeDefined();
    expect(inventoryService.getLowStockAlerts).toBeDefined();
  });

  it('should load order service', async () => {
    const orderService = await import('../../src/mocks/services/orderService.js');
    expect(orderService.getOrders).toBeDefined();
    expect(orderService.createOrder).toBeDefined();
    expect(orderService.getOrderSummary).toBeDefined();
  });
});
