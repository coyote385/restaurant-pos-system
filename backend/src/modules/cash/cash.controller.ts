import { Request, Response } from 'express';
import { CashService } from './cash.service';

export class CashController {
  static async getCurrentShift(_req: Request, res: Response) {
    try {
      const current = await CashService.getCurrentShift();
      res.json(current);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async openShift(req: Request, res: Response) {
    try {
      const { initialCash, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado.' });
      }

      const shift = await CashService.openShift({
        userId,
        initialCash: Number(initialCash) || 0,
        notes,
      });

      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async closeShift(req: Request, res: Response) {
    try {
      const { shiftId, actualCash, notes } = req.body;

      if (!shiftId) {
        return res.status(400).json({ error: 'shiftId es requerido.' });
      }

      const closed = await CashService.closeShift({
        shiftId,
        actualCash: Number(actualCash) || 0,
        notes,
      });

      res.json(closed);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const history = await CashService.getShiftHistory(date as string | undefined);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
