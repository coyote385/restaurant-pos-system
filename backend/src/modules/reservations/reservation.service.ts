import { prisma } from '../../config/prisma';
import { io } from '../../sockets/socket.server';
import { TableStatus, ReservationStatus } from '../../types/enums';

export interface CreateReservationDto {
  tableId: string;
  customerName: string;
  customerPhone?: string;
  guestsCount?: number;
  reservationDate: string; // ISO string or YYYY-MM-DDTHH:mm
  notes?: string;
}

export class ReservationService {
  static async listReservations(date?: string) {
    let dateFilter: any = {};
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      dateFilter = {
        reservationDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    return prisma.reservation.findMany({
      where: dateFilter,
      orderBy: { reservationDate: 'asc' },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            capacity: true,
            status: true,
          },
        },
      },
    });
  }

  static async createReservation(data: CreateReservationDto) {
    const { tableId, customerName, customerPhone, guestsCount = 2, reservationDate, notes } = data;

    if (!customerName || customerName.trim().length === 0) {
      throw new Error('El nombre del cliente es obligatorio.');
    }

    if (!reservationDate) {
      throw new Error('La fecha y hora de la reserva son obligatorias.');
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error('Mesa no encontrada.');
    }

    if (table.status === TableStatus.MERGED) {
      throw new Error(`La Mesa ${table.number} se encuentra unida a otra mesa.`);
    }

    const resDate = new Date(reservationDate);

    // Guardar la reserva
    const reservation = await prisma.reservation.create({
      data: {
        tableId,
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        guestsCount: Number(guestsCount) || 2,
        reservationDate: resDate,
        notes: notes?.trim() || null,
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        table: true,
      },
    });

    // Si la reserva es para hoy o inmediata, marcamos la mesa como RESERVED
    await prisma.table.update({
      where: { id: tableId },
      data: { status: TableStatus.RESERVED },
    });

    io.to('room:waiters').emit('tables:updated');

    return reservation;
  }

  static async seatReservation(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { table: true },
    });

    if (!reservation) {
      throw new Error('Reserva no encontrada.');
    }

    await prisma.$transaction(async (tx) => {
      // Marcar reserva como sentada
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.SEATED },
      });

      // Poner la mesa en OCCUPIED para empezar a tomar pedidos
      await tx.table.update({
        where: { id: reservation.tableId },
        data: { status: TableStatus.OCCUPIED },
      });
    });

    io.to('room:waiters').emit('tables:updated');

    return { message: 'Clientes sentados con éxito.', tableId: reservation.tableId };
  }

  static async cancelReservation(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { table: true },
    });

    if (!reservation) {
      throw new Error('Reserva no encontrada.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });

      // Si la mesa estaba RESERVED y no hay otra confirmada para hoy, la liberamos
      const otherReservations = await tx.reservation.count({
        where: {
          tableId: reservation.tableId,
          status: ReservationStatus.CONFIRMED,
          id: { not: reservationId },
        },
      });

      if (otherReservations === 0 && reservation.table.status === TableStatus.RESERVED) {
        await tx.table.update({
          where: { id: reservation.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }
    });

    io.to('room:waiters').emit('tables:updated');

    return { message: 'Reserva cancelada y mesa liberada.' };
  }
}
