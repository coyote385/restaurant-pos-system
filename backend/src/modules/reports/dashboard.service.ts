import { prisma } from '../../config/prisma';
import { PaymentStatus } from '../../types/enums';

export class DashboardService {
  static async getDailySummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Todas las órdenes pagadas hoy
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        items: { include: { product: { select: { name: true } } } },
        user: { select: { id: true, name: true, documentId: true } },
        table: { select: { number: true } },
      },
    });

    // Totales globales
    const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const totalTips = paidOrders.reduce((sum, o) => sum + Number(o.tipAmount), 0);
    const totalOrders = paidOrders.length;

    // Ventas por hora (0-23)
    const salesByHour: Record<number, number> = {};
    for (let h = 0; h < 24; h++) salesByHour[h] = 0;

    paidOrders.forEach((order) => {
      if (order.paidAt) {
        const hour = new Date(order.paidAt).getHours();
        salesByHour[hour] += Number(order.subtotal);
      }
    });

    const salesByHourArray = Object.entries(salesByHour)
      .map(([hour, sales]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        ventas: sales,
      }))
      .filter((h) => h.ventas > 0);

    // Top 5 platos más pedidos
    const productCount: Record<string, { name: string; count: number; total: number }> = {};
    paidOrders.forEach((order) => {
      order.items.forEach((item) => {
        const name = item.product.name;
        if (!productCount[name]) productCount[name] = { name, count: 0, total: 0 };
        productCount[name].count += item.quantity;
        productCount[name].total += Number(item.subtotal);
      });
    });

    const topProducts = Object.values(productCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({ nombre: p.name, pedidos: p.count, total: p.total }));

    // Resumen por mesero
    const waiterMap: Record<string, { name: string; documentId: string | null; sales: number; tips: number; orders: number }> = {};
    paidOrders.forEach((order) => {
      const uid = order.user.id;
      if (!waiterMap[uid]) {
        waiterMap[uid] = {
          name: order.user.name,
          documentId: order.user.documentId,
          sales: 0,
          tips: 0,
          orders: 0,
        };
      }
      waiterMap[uid].sales += Number(order.subtotal);
      waiterMap[uid].tips += Number(order.tipAmount);
      waiterMap[uid].orders += 1;
    });

    const waiterSummary = Object.values(waiterMap);

    return {
      totalSales,
      totalTips,
      totalOrders,
      salesByHour: salesByHourArray,
      topProducts,
      waiterSummary,
    };
  }
}
