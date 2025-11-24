import { createAgent } from "../lib/agent.js";
import { WorkerResult } from "../models.js";
import { ERP_WORKER_PROMPT } from "../prompts/workers/erp.js";
import * as inventoryService from "../mocks/services/inventoryService.js";
import * as orderService from "../mocks/services/orderService.js";
import { models } from "../llm-models/index.js";

const agent = createAgent({
  name: "ERPWorker",
  instructions: ERP_WORKER_PROMPT,
  model: models.workers.erp,
});

interface ERPOperation {
  operation: string;
  parameters: Record<string, unknown>;
  explanation: string;
}

const executeOperation = (op: ERPOperation): unknown => {
  const { operation, parameters } = op;

  switch (operation) {
    case "GET_STOCK":
      if (parameters.sku) {
        return inventoryService.getStockBySku(parameters.sku as string);
      }
      return inventoryService.getStock(
        parameters.location as string | undefined
      );

    case "GET_LOW_STOCK":
      return inventoryService.getLowStockAlerts();

    case "GET_DEAD_STOCK":
      return inventoryService.getDeadStock(
        parameters.days as number | undefined
      );

    case "TRANSFER_STOCK":
      return inventoryService.transferStock(
        parameters.sku as string,
        parameters.from as string,
        parameters.to as string,
        parameters.qty as number
      );

    case "GET_LOCATIONS":
      return inventoryService.getLocations();

    case "GET_ORDERS":
      return orderService.getOrders(
        parameters.status as string | undefined,
        parameters.customer_id as string | undefined
      );

    case "GET_ORDER_DETAIL":
      return orderService.getOrderDetail(parameters.order_id as string);

    case "CREATE_ORDER":
      return orderService.createOrder(
        parameters.customer_id as string,
        parameters.items as {
          sku: string;
          qty: number;
          unit_price: number;
          location: string;
        }[]
      );

    case "UPDATE_ORDER_STATUS":
      return orderService.updateOrderStatus(
        parameters.order_id as string,
        parameters.status as string
      );

    case "GET_ORDER_SUMMARY":
      return orderService.getOrderSummary();

    case "GET_CUSTOMERS":
      return orderService.getCustomers();

    default:
      return { error: `Unknown operation: ${operation}` };
  }
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
    const responseText = result.finalOutput.trim();

    // Parse the operation from agent response
    let operation: ERPOperation;
    try {
      let text = responseText;
      if (text.startsWith("```")) {
        text = text.split("```")[1];
        if (text.startsWith("json")) {
          text = text.slice(4);
        }
      }
      operation = JSON.parse(text);
    } catch {
      console.error("❌ ERP_WORKER: Failed to parse agent response");
      return {
        success: false,
        output: "",
        error: `Failed to parse operation: ${responseText}`,
      };
    }

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
