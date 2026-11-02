import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  static async waiterLogin(req: Request, res: Response) {
    try {
      const { pin, documentId } = req.body;
      const result = await AuthService.waiterPinLogin(pin, documentId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }

  static async adminLogin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.adminLogin(email, password);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }
}
