import { Router, Request, Response } from 'express';
import * as orderService from '../services/orderService.js';

export const orderRouter = Router();

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

orderRouter.get('/orders', (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const customerId = req.query.customer_id as string | undefined;
  res.json(orderService.getOrders(status, customerId));
});

orderRouter.get('/orders/summary', (_req: Request, res: Response) => {
  res.json(orderService.getOrderSummary());
});

orderRouter.get('/orders/:orderId', (req: Request, res: Response) => {
  const order = orderService.getOrderDetail(req.params.orderId);
  if (!order) {
    res.json({ error: `Order ${req.params.orderId} not found` });
    return;
  }
  res.json(order);
});

orderRouter.post('/orders', (req: Request, res: Response) => {
  const body = req.body as CreateOrderRequest;
  res.json(orderService.createOrder(body.customer_id, body.items));
});

orderRouter.patch('/orders/:orderId/status', (req: Request, res: Response) => {
  const body = req.body as UpdateStatusRequest;
  res.json(orderService.updateOrderStatus(req.params.orderId, body.status));
});

orderRouter.get('/customers', (_req: Request, res: Response) => {
  res.json(orderService.getCustomers());
});
