import { createAgent } from "../lib/agent.js";
import { WorkerResult, ERPOperation, erpOperationSchema } from "../models.js";
import { ERP_WORKER_PROMPT } from "../prompts/workers/erp.js";
import * as inventoryService from "../mocks/services/inventoryService.js";
import * as orderService from "../mocks/services/orderService.js";
import * as forecastService from "../mocks/services/forecastService.js";
import { models } from "../llm-models/index.js";

const agent = createAgent<ERPOperation>({
  name: "ERPWorker",
  instructions: ERP_WORKER_PROMPT,
  model: models.workers.erp,
  outputSchema: erpOperationSchema,
});

type OperationHandler = (parameters: Record<string, unknown>) => unknown;

const operationHandlers: Record<string, OperationHandler> = {
  GET_STOCK: (p) => p.sku
    ? inventoryService.getStockBySku(p.sku as string)
    : inventoryService.getStock(p.location as string | undefined),
  GET_LOW_STOCK: () => inventoryService.getLowStockAlerts(),
  GET_DEAD_STOCK: (p) => inventoryService.getDeadStock(p.days as number | undefined),
  TRANSFER_STOCK: (p) => inventoryService.transferStock(
    p.sku as string,
    p.from as string,
    p.to as string,
    p.qty as number
  ),
  GET_LOCATIONS: () => inventoryService.getLocations(),
  GET_ORDERS: (p) => orderService.getOrders(
    p.status as string | undefined,
    p.customer_id as string | undefined
  ),
  GET_ORDER_DETAIL: (p) => orderService.getOrderDetail(p.order_id as string),
  CREATE_ORDER: (p) => orderService.createOrder(
    p.customer_id as string,
    p.items as { sku: string; qty: number; unit_price: number; location: string }[]
  ),
  UPDATE_ORDER_STATUS: (p) => orderService.updateOrderStatus(
    p.order_id as string,
    p.status as string
  ),
  GET_ORDER_SUMMARY: () => orderService.getOrderSummary(),
  GET_CUSTOMERS: () => orderService.getCustomers(),
  GET_FORECAST: (p) => forecastService.getForecast(
    p.sku as string,
    p.period as number | undefined
  ),
  GET_FORECAST_RECOMMENDATIONS: () => forecastService.getStockoutRisks(),
  GET_SEASONAL_PATTERN: (p) => forecastService.getSeasonalPattern(p.sku as string),
};

const executeOperation = (op: ERPOperation): unknown => {
  const handler = operationHandlers[op.operation];
  if (!handler) {
    return { error: `Unknown operation: ${op.operation}` };
  }
  const parameters = JSON.parse(op.parameters_json || '{}');
  return handler(parameters);
};

export const executeErp = async (
  taskDescription: string,
  parameters: Record<string, unknown>,
  feedback?: string
): Promise<WorkerResult> => {
  console.log("🏭 ERP_WORKER: Starting execution");
  console.log(`   Task: ${taskDescription.slice(0, 80)}...`);
  if (feedback) {
    console.log("   With feedback from previous attempt");
  }

  try {
    let context = `Task: ${taskDescription}

Parameters provided: ${JSON.stringify(parameters)}

Determine the appropriate ERP operation and execute it.`;

    if (feedback) {
      context += `\n\nPrevious feedback to address: ${feedback}`;
    }

    const result = await agent.run(context);
    const operation = result.finalOutput;

    console.log(`🏭 ERP_WORKER: Executing ${operation.operation}`);
    console.log(`   Explanation: ${operation.explanation}`);

    // Execute the operation
    const operationResult = executeOperation(operation);

    // Check for errors in result
    if (
      operationResult &&
      typeof operationResult === "object" &&
      "error" in operationResult
    ) {
      console.error(
        `❌ ERP_WORKER: Operation failed: ${
          (operationResult as { error: string }).error
        }`
      );
      return {
        success: false,
        output: "",
        error: (operationResult as { error: string }).error,
      };
    }

    const output = `${operation.explanation}\n\nResult:\n${JSON.stringify(
      operationResult,
      null,
      2
    )}`;

    console.log("✓ ERP_WORKER: Execution complete");
    return {
      success: true,
      output,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ ERP_WORKER: Failed with error: ${errorMsg}`);
    return {
      success: false,
      output: "",
      error: errorMsg,
    };
  }
};
