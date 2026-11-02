import { Request, Response } from 'express';
import { ShiftService } from './shift.service';

export class ShiftController {
  static async open(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const shift = await ShiftService.openShift(userId);
      return res.status(201).json(shift);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async close(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const shift = await ShiftService.closeShift(userId);
      return res.status(200).json(shift);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async myCurrent(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const shift = await ShiftService.getMyCurrentShift(userId);
      return res.status(200).json(shift);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async history(req: Request, res: Response) {
    try {
      const date = req.query.date as string | undefined;
      const shifts = await ShiftService.getShiftHistory(date);
      return res.status(200).json(shifts);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
