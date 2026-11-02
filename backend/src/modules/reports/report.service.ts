import { prisma } from '../../config/prisma';
import { PaymentStatus } from '../../types/enums';

export class ReportService {
  static async getWaiterShiftTips(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const paidOrders = await prisma.order.findMany({
      where: {
        userId,
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: startOfDay },
      },
      select: {
        orderNumber: true,
        subtotal: true,
        tipAmount: true,
        total: true,
        paidAt: true,
        table: { select: { number: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalTips = paidOrders.reduce((sum, o) => sum + Number(o.tipAmount), 0);
    const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

    return {
      waiterId: userId,
      ordersCount: paidOrders.length,
      totalSales,
      totalTips,
      orders: paidOrders,
    };
  }

  static async getManagerConsolidatedReport() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const waiters = await prisma.user.findMany({
      where: { role: 'WAITER' },
      select: {
        id: true,
        name: true,
        documentId: true,
        orders: {
          where: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: { gte: startOfDay },
          },
          select: {
            subtotal: true,
            tipAmount: true,
          },
        },
      },
    });

    return waiters.map((w) => {
      const totalSales = w.orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
      const totalTips = w.orders.reduce((sum, o) => sum + Number(o.tipAmount), 0);
      return {
        id: w.id,
        name: w.name,
        documentId: w.documentId,
        ordersServed: w.orders.length,
        totalSales,
        totalTips,
      };
    });
  }
}
