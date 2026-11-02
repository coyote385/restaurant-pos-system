import { Request, Response } from 'express';
import { WasteService } from './waste.service';

export class WasteController {
  static async cancelItem(req: Request, res: Response) {
    try {
      const { orderItemId, reason, notes, isWaste } = req.body;
      const userId = req.user!.id;

      if (!orderItemId || !reason) {
        return res.status(400).json({ error: 'orderItemId y motivo de cancelación son obligatorios.' });
      }

      const result = await WasteService.cancelItem({
        orderItemId,
        userId,
        reason,
        notes,
        isWaste: Boolean(isWaste),
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async cancelOrder(req: Request, res: Response) {
    try {
      const { orderId, reason, notes } = req.body;
      const userId = req.user!.id;

      if (!orderId || !reason) {
        return res.status(400).json({ error: 'orderId y motivo de cancelación son obligatorios.' });
      }

      const result = await WasteService.cancelOrder({
        orderId,
        userId,
        reason,
        notes,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getLogs(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const result = await WasteService.getWasteLogs(date as string | undefined);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
