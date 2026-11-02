import { Request, Response } from 'express';
import { ReservationService } from './reservation.service';

export class ReservationController {
  static async list(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const reservations = await ReservationService.listReservations(date as string | undefined);
      res.json(reservations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { tableId, customerName, customerPhone, guestsCount, reservationDate, notes } = req.body;
      const reservation = await ReservationService.createReservation({
        tableId,
        customerName,
        customerPhone,
        guestsCount,
        reservationDate,
        notes,
      });
      res.status(201).json(reservation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async seat(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ReservationService.seatReservation(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ReservationService.cancelReservation(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
