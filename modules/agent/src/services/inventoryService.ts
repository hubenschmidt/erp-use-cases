/**
 * Inventory Service
 *
 * Business logic for inventory management operations including:
 * - Stock queries by location or SKU
 * - Low stock alerts based on reorder points
 * - Dead stock identification with carrying cost calculations
 * - Inter-warehouse stock transfers
 */

import * as inventoryRepo from '../repositories/inventoryRepo.js';
import * as productRepo from '../repositories/productRepo.js';

/**
 * Get all stock items, optionally filtered by warehouse location.
 */
export const getStock = (location?: string) => {
  if (location) {
    return inventoryRepo.findStockByLocation(location);
  }
  return inventoryRepo.getAllStock();
};

/**
 * Get aggregated stock information for a specific SKU across all locations.
 * Returns total on-hand, available quantity, and breakdown by location.
 */
export const getStockBySku = (sku: string) => {
  const items = inventoryRepo.findStockBySku(sku);
  const totalOnHand = items.reduce((sum, s) => sum + s.qty_on_hand, 0);
  const totalReserved = items.reduce((sum, s) => sum + s.qty_reserved, 0);
  const productName = items[0]?.product_name ?? null;

  return {
    sku,
    product_name: productName,
    total_on_hand: totalOnHand,
    total_available: totalOnHand - totalReserved,
    by_location: items,
  };
};

/**
 * Identify SKUs with stock levels below their reorder points.
 * Returns items grouped by SKU with details on which locations are below threshold.
 */
export const getLowStockAlerts = () => {
  const stock = inventoryRepo.getAllStock();
  const skuTotals = new Map<string, {
    sku: string;
    product_name: string;
    total_available: number;
    reorder_point: number;
    locations_below: { location: string; available: number; reorder_point: number }[];
  }>();

  for (const s of stock) {
    if (!skuTotals.has(s.sku)) {
      skuTotals.set(s.sku, {
        sku: s.sku,
        product_name: s.product_name,
        total_available: 0,
        reorder_point: s.reorder_point,
        locations_below: [],
      });
    }

    const data = skuTotals.get(s.sku)!;
    const available = s.qty_on_hand - s.qty_reserved;
    data.total_available += available;

    if (available < s.reorder_point) {
      data.locations_below.push({
        location: s.location,
        available,
        reorder_point: s.reorder_point,
      });
    }
  }

  return Array.from(skuTotals.values()).filter((data) => data.locations_below.length > 0);
};

/**
 * Find inventory items with no movement for specified days.
 * Calculates estimated carrying cost (25% annual rate) for each dead stock item.
 * Results sorted by days since last movement (oldest first).
 */
export const getDeadStock = (daysThreshold: number = 90) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  const stock = inventoryRepo.getAllStock();

  return stock
    .filter((s) => {
      const lastMove = new Date(s.last_movement);
      return lastMove < cutoff && s.qty_on_hand > 0;
    })
    .map((s) => {
      const lastMove = new Date(s.last_movement);
      const daysSinceMovement = Math.floor(
        (Date.now() - lastMove.getTime()) / (1000 * 60 * 60 * 24)
      );
      const product = productRepo.findProductBySku(s.sku);
      const unitCost = product?.unit_cost ?? 0;
      const carryingCost = s.qty_on_hand * unitCost * 0.25 * (daysSinceMovement / 365);

      return {
        ...s,
        days_since_movement: daysSinceMovement,
        estimated_carrying_cost: Math.round(carryingCost * 100) / 100,
      };
    })
    .sort((a, b) => b.days_since_movement - a.days_since_movement);
};

/**
 * Transfer stock between warehouse locations.
 * Validates available quantity (on-hand minus reserved) before transfer.
 * Creates new stock record at destination if SKU doesn't exist there.
 */
export const transferStock = (
  sku: string,
  fromLocation: string,
  toLocation: string,
  qty: number
) => {
  const fromItem = inventoryRepo.findStockItem(sku, fromLocation);
  if (!fromItem) {
    return { error: `SKU ${sku} not found in ${fromLocation}` };
  }

  const available = fromItem.qty_on_hand - fromItem.qty_reserved;
  if (available < qty) {
    return { error: `Insufficient available stock. Available: ${available}` };
  }

  const today = new Date().toISOString().split('T')[0];

  inventoryRepo.updateStockItem(sku, fromLocation, {
    qty_on_hand: fromItem.qty_on_hand - qty,
    last_movement: today,
  });

  const toItem = inventoryRepo.findStockItem(sku, toLocation);
  if (!toItem) {
    inventoryRepo.appendStockItem({
      sku,
      product_name: fromItem.product_name,
      location: toLocation,
      qty_on_hand: qty,
      qty_reserved: 0,
      reorder_point: fromItem.reorder_point,
      last_movement: today,
    });
  }
  if (toItem) {
    inventoryRepo.updateStockItem(sku, toLocation, {
      qty_on_hand: toItem.qty_on_hand + qty,
      last_movement: today,
    });
  }

  return {
    success: true,
    transfer: {
      sku,
      from: fromLocation,
      to: toLocation,
      qty,
    },
  };
};

/**
 * Get all warehouse locations.
 */
export const getLocations = () => {
  return inventoryRepo.getAllLocations();
};
