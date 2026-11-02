import { prisma } from '../../config/prisma';
import { PaymentStatus } from '../../types/enums';

export class CashService {
  static async getCurrentShift() {
    const shift = await prisma.cashShift.findFirst({
      where: { isOpen: true },
      include: {
        openedBy: {
          select: { id: true, name: true, documentId: true },
        },
      },
    });

    if (!shift) return null;

    // Calcular totales en vivo desde que se abrió este turno
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: shift.openedAt },
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        tipAmount: true,
        paymentMethod: true,
      },
    });

    let liveSalesCash = 0;
    let liveSalesCard = 0;
    let liveSalesTrans = 0;
    let liveTotalTips = 0;

    for (const order of paidOrders) {
      const orderTotal = Number(order.total || 0);
      const method = (order.paymentMethod || 'EFECTIVO').toUpperCase();

      if (method === 'TARJETA') {
        liveSalesCard += orderTotal;
      } else if (method === 'TRANSFERENCIA') {
        liveSalesTrans += orderTotal;
      } else {
        liveSalesCash += orderTotal;
      }

      liveTotalTips += Number(order.tipAmount || 0);
    }

    const expectedCash = Number(shift.initialCash) + liveSalesCash;

    return {
      shift,
      liveTotals: {
        salesCash: liveSalesCash,
        salesCard: liveSalesCard,
        salesTrans: liveSalesTrans,
        totalSalesAll: liveSalesCash + liveSalesCard + liveSalesTrans,
        totalTips: liveTotalTips,
        ordersCount: paidOrders.length,
        expectedCash,
      },
    };
  }

  static async openShift(data: { userId: string; initialCash: number; notes?: string }) {
    const existingOpen = await prisma.cashShift.findFirst({
      where: { isOpen: true },
    });

    if (existingOpen) {
      throw new Error('Ya existe una caja abierta en el restaurante. Debes cerrarla antes de abrir una nueva.');
    }

    return prisma.cashShift.create({
      data: {
        openedById: data.userId,
        initialCash: Number(data.initialCash) || 0,
        notes: data.notes?.trim() || null,
        isOpen: true,
      },
      include: {
        openedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  static async closeShift(data: { shiftId: string; actualCash: number; notes?: string }) {
    const shift = await prisma.cashShift.findUnique({
      where: { id: data.shiftId },
    });

    if (!shift || !shift.isOpen) {
      throw new Error('Turno de caja no encontrado o ya cerrado.');
    }

    // Calcular totales consolidados
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: shift.openedAt },
      },
      select: {
        total: true,
        tipAmount: true,
        paymentMethod: true,
      },
    });

    let totalSalesCash = 0;
    let totalSalesCard = 0;
    let totalSalesTrans = 0;
    let totalTips = 0;

    for (const order of paidOrders) {
      const orderTotal = Number(order.total || 0);
      const method = (order.paymentMethod || 'EFECTIVO').toUpperCase();

      if (method === 'TARJETA') {
        totalSalesCard += orderTotal;
      } else if (method === 'TRANSFERENCIA') {
        totalSalesTrans += orderTotal;
      } else {
        totalSalesCash += orderTotal;
      }

      totalTips += Number(order.tipAmount || 0);
    }

    const expectedCash = Number(shift.initialCash) + totalSalesCash;
    const actualCash = Number(data.actualCash) || 0;
    const difference = actualCash - expectedCash;

    const closedShift = await prisma.cashShift.update({
      where: { id: data.shiftId },
      data: {
        isOpen: false,
        closedAt: new Date(),
        actualCash,
        expectedCash,
        difference,
        totalSalesCash,
        totalSalesCard,
        totalSalesTrans,
        totalTips,
        ordersCount: paidOrders.length,
        notes: data.notes?.trim() || shift.notes,
      },
      include: {
        openedBy: {
          select: { id: true, name: true },
        },
      },
    });

    return closedShift;
  }

  static async getShiftHistory(date?: string) {
    let dateFilter: any = {};
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      dateFilter = {
        openedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    return prisma.cashShift.findMany({
      where: dateFilter,
      orderBy: { openedAt: 'desc' },
      include: {
        openedBy: {
          select: { id: true, name: true, documentId: true },
        },
      },
    });
  }
}
