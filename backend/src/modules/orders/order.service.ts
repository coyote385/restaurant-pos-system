import { prisma } from '../../config/prisma';
import { io } from '../../sockets/socket.server';
import { OrderStatus, TableStatus, PaymentStatus } from '../../types/enums';

interface OrderItemModifierDto {
  optionId?: string;
  name: string;
  price: number;
}

interface CreateOrderItemDto {
  productId: string;
  quantity: number;
  notes?: string;
  modifiers?: OrderItemModifierDto[];
}

export class OrderService {
  static async createOrder(
    tableId: string,
    userId: string,
    items: CreateOrderItemDto[],
    generalNotes?: string
  ) {
    const order = await prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({ where: { id: tableId } });
      if (!table) throw new Error('La mesa no existe.');

      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isAvailable: true },
      });

      if (products.length !== items.length) {
        throw new Error('Uno o más productos seleccionados están agotados.');
      }

      let calculatedSubtotal = 0;
      const orderItemsData = items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const modSum = (item.modifiers || []).reduce((acc, m) => acc + Number(m.price || 0), 0);
        const unitPrice = Number(product.price) + modSum;
        const subtotal = unitPrice * item.quantity;
        calculatedSubtotal += subtotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
          notes: item.notes,
          station: product.station || 'KITCHEN',
          modifiers: {
            create: (item.modifiers || []).map((m) => ({
              optionId: m.optionId || null,
              name: m.name,
              price: Number(m.price || 0),
            })),
          },
        };
      });

      // Calcular número correlativo de orden
      const count = await tx.order.count();
      const orderNumber = count + 1;

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          tableId,
          userId,
          status: OrderStatus.RECEIVED,
          subtotal: calculatedSubtotal,
          total: calculatedSubtotal,
          notes: generalNotes,
          items: {
            create: orderItemsData.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.subtotal,
              notes: it.notes,
              station: it.station,
              modifiers: it.modifiers,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              modifiers: true,
            },
          },
          table: true,
          user: { select: { id: true, name: true, documentId: true } },
        },
      });

      await tx.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED },
      });

      return newOrder;
    });

    // ⚡ Socket.io:
    io.to('room:kitchen').emit('order:created', order);
    io.to('room:waiters').emit('table:status_changed', {
      tableId: order.tableId,
      status: TableStatus.OCCUPIED,
    });

    return order;
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus) {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        table: true,
        user: { select: { id: true, name: true } },
      },
    });

    // Sincronizar el estado de todos los ítems de la orden
    await prisma.orderItem.updateMany({
      where: { orderId },
      data: { status },
    });

    io.to('room:kitchen').to('room:waiters').emit('order:status_changed', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
    });

    if (status === OrderStatus.READY) {
      io.to('room:waiters').emit('order:ready_to_serve', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        tableNumber: updatedOrder.table.number,
        waiterId: updatedOrder.userId,
        waiterName: updatedOrder.user.name,
      });
    }

    return updatedOrder;
  }

  static async updateItemStatus(itemId: string, status: string) {
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          include: {
            table: true,
            user: true,
          },
        },
        product: true,
      },
    });

    if (!item) throw new Error('Ítem no encontrado.');

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { product: true, modifiers: true },
    });

    // Verificar el estado consolidado de todos los ítems de esta comanda
    const allOrderItems = await prisma.orderItem.findMany({
      where: { orderId: item.orderId },
    });

    const allReadyOrDelivered = allOrderItems.every(
      (it) => it.status === 'READY' || it.status === 'DELIVERED'
    );
    const anyInPrep = allOrderItems.some((it) => it.status === 'IN_PREPARATION');

    let newOrderStatus = item.order.status;
    if (allReadyOrDelivered) {
      newOrderStatus = OrderStatus.READY;
    } else if (anyInPrep && item.order.status === OrderStatus.RECEIVED) {
      newOrderStatus = OrderStatus.IN_PREPARATION;
    }

    if (newOrderStatus !== item.order.status) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: newOrderStatus },
      });

      io.to('room:kitchen').to('room:waiters').emit('order:status_changed', {
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        status: newOrderStatus,
      });

      if (newOrderStatus === OrderStatus.READY) {
        io.to('room:waiters').emit('order:ready_to_serve', {
          orderId: item.orderId,
          orderNumber: item.order.orderNumber,
          tableNumber: item.order.table.number,
          waiterId: item.order.userId,
          waiterName: item.order.user.name,
        });
      }
    }

    // Notificar cambio de estado del ítem a las pantallas KDS
    io.to('room:kitchen').emit('order:item_status_changed', {
      orderId: item.orderId,
      itemId: updatedItem.id,
      status: updatedItem.status,
      station: updatedItem.station,
    });

    // Alerta específica al mesero si un ítem está listo
    if (status === 'READY') {
      const stationLabel = updatedItem.station === 'BAR' ? 'Barra / Bebidas' : 'Cocina';
      io.to('room:waiters').emit('order:station_item_ready', {
        orderId: item.orderId,
        orderNumber: item.order.orderNumber,
        tableNumber: item.order.table.number,
        productName: item.product.name,
        station: updatedItem.station,
        stationLabel,
      });
    }

    return updatedItem;
  }

  static async getActiveKitchenOrders() {
    return await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.RECEIVED, OrderStatus.IN_PREPARATION, OrderStatus.READY],
        },
      },
      include: {
        table: true,
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, station: true } },
            modifiers: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async payAndCloseOrder(orderId: string, tipAmount: number = 0) {
    const closedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) throw new Error('Pedido no encontrado.');
      if (order.paymentStatus === PaymentStatus.PAID) {
        throw new Error('Este pedido ya fue pagado previamente.');
      }

      const subtotal = Number(order.subtotal);
      const totalWithTip = subtotal + tipAmount;

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          tipAmount,
          total: totalWithTip,
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.DELIVERED,
          paidAt: new Date(),
        },
        include: { table: true, user: true },
      });

      await tx.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.AVAILABLE },
      });

      return updated;
    });

    io.to('room:waiters').emit('table:status_changed', {
      tableId: closedOrder.tableId,
      status: TableStatus.AVAILABLE,
    });

    return closedOrder;
  }
}
