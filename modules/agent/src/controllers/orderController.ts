import { Request, Response } from 'express';
import * as orderService from '../services/orderService.js';

interface OrderItem {
  sku: string;
  qty: number;
  unit_price: number;
  location: string;
}

interface CreateOrderRequest {
  customer_id: string;
  items: OrderItem[];
}

interface UpdateStatusRequest {
  status: string;
}

export const getOrders = (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const customerId = req.query.customer_id as string | undefined;
  res.json(orderService.getOrders(status, customerId));
};

export const getOrderSummary = (_req: Request, res: Response) => {
  res.json(orderService.getOrderSummary());
};

export const getOrderById = (req: Request, res: Response) => {
  const order = orderService.getOrderDetail(req.params.orderId);
  if (!order) {
    res.json({ error: `Order ${req.params.orderId} not found` });
    return;
  }
  res.json(order);
};

export const createOrder = (req: Request, res: Response) => {
  const body = req.body as CreateOrderRequest;
  res.json(orderService.createOrder(body.customer_id, body.items));
};

export const updateOrderStatus = (req: Request, res: Response) => {
  const body = req.body as UpdateStatusRequest;
  res.json(orderService.updateOrderStatus(req.params.orderId, body.status));
};

export const getCustomers = (_req: Request, res: Response) => {
  res.json(orderService.getCustomers());
};
