import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';

export const orderRouter = Router();

orderRouter.get('/orders', orderController.getOrders);
orderRouter.get('/orders/summary', orderController.getOrderSummary);
orderRouter.get('/orders/:orderId', orderController.getOrderById);
orderRouter.post('/orders', orderController.createOrder);
orderRouter.patch('/orders/:orderId/status', orderController.updateOrderStatus);
orderRouter.get('/customers', orderController.getCustomers);
