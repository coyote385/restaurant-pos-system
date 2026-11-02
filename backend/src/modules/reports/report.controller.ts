import { Request, Response } from 'express';
import { ReportService } from './report.service';
import { DashboardService } from './dashboard.service';

export class ReportController {
  static async getMyTips(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const report = await ReportService.getWaiterShiftTips(userId);
      return res.status(200).json(report);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getShiftSummary(_req: Request, res: Response) {
    try {
      const summary = await ReportService.getManagerConsolidatedReport();
      return res.status(200).json(summary);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getDailyDashboard(_req: Request, res: Response) {
    try {
      const data = await DashboardService.getDailySummary();
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
