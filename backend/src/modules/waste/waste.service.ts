import { prisma } from '../../config/prisma';
import { io } from '../../sockets/socket.server';
import { OrderStatus, TableStatus } from '../../types/enums';

export class WasteService {
  static async cancelItem(params: {
    orderItemId: string;
    userId: string;
    reason: string;
    notes?: string;
    isWaste?: boolean;
  }) {
    const { orderItemId, userId, reason, notes, isWaste } = params;

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        product: true,
        order: {
          include: {
            table: true,
            items: true,
          },
        },
      },
    });

    if (!item) throw new Error('Ítem no encontrado.');

    const wasAlreadyPrepared = item.status === 'IN_PREPARATION' || item.status === 'READY';
    const registerAsWaste = isWaste ?? wasAlreadyPrepared;
    const lossCost = Number(item.subtotal || 0);

    return await prisma.$transaction(async (tx) => {
      // 1. Si genera merma/pérdida, registrar en WasteLog
      let wasteLog = null;
      if (registerAsWaste) {
        wasteLog = await tx.wasteLog.create({
          data: {
            userId,
            reason,
            notes: notes?.trim() || null,
            cost: lossCost,
            productName: item.product.name,
            quantity: item.quantity,
            orderId: item.orderId,
          },
        });
      }

      // 2. Eliminar el ítem de la comanda
      await tx.orderItem.delete({
        where: { id: orderItemId },
      });

      // 3. Recalcular el subtotal y total de la orden
      const remainingItems = await tx.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      if (remainingItems.length === 0) {
        // La orden quedó vacía -> Cancelar la orden
        await tx.order.update({
          where: { id: item.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancellationReason: reason,
            cancelledAt: new Date(),
            subtotal: 0,
            total: 0,
          },
        });

        // Verificar si la mesa tiene otras órdenes activas
        const otherActiveOrders = await tx.order.findMany({
          where: {
            tableId: item.order.tableId,
            id: { not: item.orderId },
            paymentStatus: 'PENDING',
            status: { not: OrderStatus.CANCELLED },
          },
        });

        if (otherActiveOrders.length === 0) {
          await tx.table.update({
            where: { id: item.order.tableId },
            data: { status: TableStatus.AVAILABLE },
          });
        }
      } else {
        const newSubtotal = remainingItems.reduce((acc, it) => acc + Number(it.subtotal || 0), 0);
        await tx.order.update({
          where: { id: item.orderId },
          data: {
            subtotal: newSubtotal,
            total: newSubtotal,
          },
        });
      }

      // 4. Emitir eventos en tiempo real
      io.to('room:kitchen').to('room:waiters').emit('order:item_cancelled', {
        orderId: item.orderId,
        itemId: orderItemId,
        productName: item.product.name,
        tableNumber: item.order.table.number,
        reason,
      });
      io.to('room:waiters').emit('tables:updated');

      return {
        message: 'Ítem cancelado con éxito.',
        wasteLog,
      };
    });
  }

  static async cancelOrder(params: {
    orderId: string;
    userId: string;
    reason: string;
    notes?: string;
  }) {
    const { orderId, userId, reason, notes } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new Error('Comanda no encontrada.');

    return await prisma.$transaction(async (tx) => {
      // Registrar WasteLog para cualquier ítem que ya estaba en marcha o listo
      for (const it of order.items) {
        if (it.status === 'IN_PREPARATION' || it.status === 'READY') {
          await tx.wasteLog.create({
            data: {
              userId,
              reason,
              notes: notes?.trim() || null,
              cost: Number(it.subtotal || 0),
              productName: it.product.name,
              quantity: it.quantity,
              orderId: order.id,
            },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Si no quedan órdenes activas en la mesa, liberarla
      const otherActiveOrders = await tx.order.findMany({
        where: {
          tableId: order.tableId,
          id: { not: orderId },
          paymentStatus: 'PENDING',
          status: { not: OrderStatus.CANCELLED },
        },
      });

      if (otherActiveOrders.length === 0) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      io.to('room:kitchen').to('room:waiters').emit('order:status_changed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: OrderStatus.CANCELLED,
      });
      io.to('room:waiters').emit('tables:updated');

      return { message: 'Comanda cancelada y auditada correctamente.' };
    });
  }

  static async getWasteLogs(date?: string) {
    let dateFilter: any = {};
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      dateFilter = {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const logs = await prisma.wasteLog.findMany({
      where: dateFilter,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, documentId: true, role: true } },
      },
    });

    const totalLoss = logs.reduce((sum, log) => sum + Number(log.cost || 0), 0);
    const totalItems = logs.reduce((sum, log) => sum + Number(log.quantity || 1), 0);

    // Contar motivos más comunes
    const reasonCounts: { [reason: string]: number } = {};
    logs.forEach((log) => {
      reasonCounts[log.reason] = (reasonCounts[log.reason] || 0) + 1;
    });

    let topReason = 'Ninguna';
    let maxCount = 0;
    for (const [r, cnt] of Object.entries(reasonCounts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        topReason = r;
      }
    }

    return {
      logs,
      summary: {
        totalLoss,
        totalItems,
        totalEvents: logs.length,
        topReason: maxCount > 0 ? `${topReason} (${maxCount})` : 'Sin registros',
      },
    };
  }
}
