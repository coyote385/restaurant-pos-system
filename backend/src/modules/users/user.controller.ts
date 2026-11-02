import { Request, Response } from 'express';
import { UserService } from './user.service';

export class UserController {
  static async listUsers(_req: Request, res: Response) {
    try {
      const users = await UserService.listUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { name, documentId, pin, role, email, password } = req.body;
      const newUser = await UserService.createUser({
        name,
        documentId,
        pin,
        role,
        email,
        password,
      });
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async toggleStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await UserService.toggleUserStatus(id);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updatePin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { pin } = req.body;
      const result = await UserService.updatePin(id, pin);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, documentId, role } = req.body;
      const updated = await UserService.updateUser(id, { name, documentId, role });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
