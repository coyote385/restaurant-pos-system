import { Request, Response } from 'express';
import { OrderService } from './order.service';

export class OrderController {
  static async create(req: Request, res: Response) {
    try {
      const { tableId, items, notes } = req.body;
      const userId = req.user!.id;

      const order = await OrderService.createOrder(tableId, userId, items, notes);
      return res.status(201).json(order);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await OrderService.updateOrderStatus(id, status);
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async updateItemStatus(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { status } = req.body;

      const updatedItem = await OrderService.updateItemStatus(itemId, status);
      return res.status(200).json(updatedItem);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getKitchenOrders(_req: Request, res: Response) {
    try {
      const orders = await OrderService.getActiveKitchenOrders();
      return res.status(200).json(orders);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async payOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tipAmount } = req.body;

      const order = await OrderService.payAndCloseOrder(id, Number(tipAmount || 0));
      return res.status(200).json(order);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
