import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data');

export interface OrderItem {
  sku: string;
  qty: number;
  unit_price: number;
  location: string;
}

export interface Order {
  id: string;
  customer_id: string;
  status: string;
  created_at: string;
  shipped_at: string | null;
  items: OrderItem[];
  total: number;
}

let orders: Order[] = [];
let validStatuses: string[] = [];

const loadData = (): void => {
  if (orders.length > 0) return;

  const data = JSON.parse(readFileSync(join(DATA_PATH, 'orders.json'), 'utf-8'));
  orders = data.orders;
  validStatuses = data.statuses;
};

export const getAllOrders = (): Order[] => {
  loadData();
  return orders;
};

export const findOrderById = (orderId: string): Order | undefined => {
  loadData();
  return orders.find((o) => o.id === orderId);
};

export const appendOrder = (order: Order): Order => {
  loadData();
  orders.push(order);
  return order;
};

export const getValidStatuses = (): string[] => {
  loadData();
  return validStatuses;
};

export const getOrderCount = (): number => {
  loadData();
  return orders.length;
};
