import { prisma } from '../../config/prisma';
import { PaymentStatus } from '../../types/enums';

export class ShiftService {
  // Abrir turno (verifica que no tenga uno ya abierto)
  static async openShift(userId: string) {
    const existing = await prisma.shift.findFirst({
      where: { userId, isOpen: true },
    });

    if (existing) {
      throw new Error('Ya tienes un turno abierto. Ciérralo antes de abrir uno nuevo.');
    }

    return await prisma.shift.create({
      data: { userId },
      include: { user: { select: { name: true, documentId: true } } },
    });
  }

  // Cerrar turno: calcula totales de ventas y propinas del período
  static async closeShift(userId: string) {
    const shift = await prisma.shift.findFirst({
      where: { userId, isOpen: true },
    });

    if (!shift) {
      throw new Error('No tienes un turno abierto para cerrar.');
    }

    // Sumar ventas y propinas desde que abrió el turno
    const orders = await prisma.order.findMany({
      where: {
        userId,
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: shift.openedAt },
      },
      select: { subtotal: true, tipAmount: true },
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const totalTips = orders.reduce((sum, o) => sum + Number(o.tipAmount), 0);
    const ordersCount = orders.length;

    const closedShift = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        isOpen: false,
        closedAt: new Date(),
        totalSales,
        totalTips,
        ordersCount,
      },
      include: { user: { select: { name: true, documentId: true } } },
    });

    return closedShift;
  }

  // Obtener turno activo del usuario
  static async getMyCurrentShift(userId: string) {
    const shift = await prisma.shift.findFirst({
      where: { userId, isOpen: true },
      include: { user: { select: { name: true, documentId: true } } },
    });

    if (!shift) return null;

    // Calcular acumulado en tiempo real (aunque el turno esté abierto)
    const orders = await prisma.order.findMany({
      where: {
        userId,
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: shift.openedAt },
      },
      select: { subtotal: true, tipAmount: true },
    });

    return {
      ...shift,
      liveTotalSales: orders.reduce((sum, o) => sum + Number(o.subtotal), 0),
      liveTotalTips: orders.reduce((sum, o) => sum + Number(o.tipAmount), 0),
      liveOrdersCount: orders.length,
    };
  }

  // Historial completo de turnos (solo Admin)
  static async getShiftHistory(date?: string) {
    const whereDate = date
      ? {
          openedAt: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lte: new Date(`${date}T23:59:59.999Z`),
          },
        }
      : {};

    return await prisma.shift.findMany({
      where: whereDate,
      include: {
        user: { select: { id: true, name: true, documentId: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }
}
