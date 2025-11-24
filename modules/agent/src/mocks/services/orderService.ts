/**
 * Order Service
 *
 * Business logic for order management operations including:
 * - Order queries with status/customer filtering
 * - Order creation with automatic ID generation and total calculation
 * - Order status workflow management
 * - Order summary/analytics
 * - Customer data access
 */

import * as orderRepo from '../repositories/orderRepo.js';
import * as customerRepo from '../repositories/customerRepo.js';

interface OrderItem {
  sku: string;
  qty: number;
  unit_price: number;
  location: string;
}

/**
 * Get all orders with optional filtering by status and/or customer.
 */
export const getOrders = (status?: string, customerId?: string) => {
  let orders = orderRepo.getAllOrders();

  if (status) {
    orders = orders.filter((o) => o.status === status);
  }
  if (customerId) {
    orders = orders.filter((o) => o.customer_id === customerId);
  }

  return orders;
};

/**
 * Get order details enriched with customer information (name, email, shipping address).
 */
export const getOrderDetail = (orderId: string) => {
  const order = orderRepo.findOrderById(orderId);
  if (!order) return null;

  const customer = customerRepo.findCustomerById(order.customer_id);

  return {
    ...order,
    customer_name: customer?.name,
    customer_email: customer?.email,
    shipping_address: customer?.shipping_address,
  };
};

/**
 * Create a new order for a customer.
 * Auto-generates order ID (ORD-10001, 10002, etc.) and calculates total from items.
 * Validates customer exists before creating order.
 */
export const createOrder = (customerId: string, items: OrderItem[]) => {
  const customer = customerRepo.findCustomerById(customerId);
  if (!customer) {
    return { error: `Customer ${customerId} not found` };
  }

  const orderId = `ORD-${10000 + orderRepo.getOrderCount() + 1}`;
  const total = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  const newOrder = {
    id: orderId,
    customer_id: customerId,
    status: 'pending',
    created_at: new Date().toISOString(),
    shipped_at: null,
    items,
    total,
  };

  return orderRepo.appendOrder(newOrder);
};

/**
 * Update order status (pending → processing → shipped → delivered).
 * Validates status is in allowed list. Sets shipped_at timestamp when status becomes 'shipped'.
 */
export const updateOrderStatus = (orderId: string, newStatus: string) => {
  const validStatuses = orderRepo.getValidStatuses();
  if (!validStatuses.includes(newStatus)) {
    return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const order = orderRepo.findOrderById(orderId);
  if (!order) {
    return { error: `Order ${orderId} not found` };
  }

  order.status = newStatus;
  if (newStatus === 'shipped') {
    order.shipped_at = new Date().toISOString();
  }

  return order;
};

/**
 * Get order analytics: count by status, total orders, and total revenue.
 */
export const getOrderSummary = () => {
  const orders = orderRepo.getAllOrders();
  const validStatuses = orderRepo.getValidStatuses();

  const summary: Record<string, number> = {};
  for (const status of validStatuses) {
    summary[status] = 0;
  }

  let totalValue = 0;

  for (const order of orders) {
    summary[order.status] = (summary[order.status] ?? 0) + 1;
    totalValue += order.total;
  }

  return {
    by_status: summary,
    total_orders: orders.length,
    total_value: totalValue,
  };
};

/**
 * Get all customers.
 */
export const getCustomers = () => {
  return customerRepo.getAllCustomers();
};
