import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { io } from '../../sockets/socket.server';
import { TableStatus, PaymentStatus, OrderStatus } from '../../types/enums';

export class TableController {
  static async getTables(_req: Request, res: Response) {
    try {
      const tables = await prisma.table.findMany({
        where: { isActive: true },
        orderBy: { number: 'asc' },
        include: {
          mergedTables: {
            select: { id: true, number: true, capacity: true, status: true },
          },
          mergedInto: {
            select: { id: true, number: true },
          },
          reservations: {
            where: {
              status: 'CONFIRMED',
            },
            orderBy: { reservationDate: 'asc' },
            take: 1,
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              guestsCount: true,
              reservationDate: true,
              notes: true,
              status: true,
            },
          },
          orders: {
            where: {
              paymentStatus: PaymentStatus.PENDING,
              status: { not: OrderStatus.CANCELLED },
            },
            select: {
              id: true,
              orderNumber: true,
              status: true,
              subtotal: true,
              total: true,
              createdAt: true,
              user: {
                select: { id: true, name: true, documentId: true },
              },
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  subtotal: true,
                  notes: true,
                  product: { select: { name: true } },
                  modifiers: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return res.status(200).json(tables);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(TableStatus).includes(status)) {
        return res.status(400).json({ error: 'Estado de mesa inválido.' });
      }

      const updated = await prisma.table.update({
        where: { id },
        data: { status },
      });

      io.to('room:waiters').emit('table:status_changed', {
        tableId: updated.id,
        status: updated.status,
      });
      io.to('room:waiters').emit('tables:updated');

      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Actualizar posición en el mapa (Drag & Drop)
  static async updatePosition(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { posX, posY } = req.body;

      if (typeof posX !== 'number' || typeof posY !== 'number') {
        return res.status(400).json({ error: 'posX y posY deben ser números.' });
      }

      const updated = await prisma.table.update({
        where: { id },
        data: { posX: Math.max(0, Math.min(95, posX)), posY: Math.max(0, Math.min(90, posY)) },
      });

      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Unir mesas para atender grupos grandes
  static async mergeTables(req: Request, res: Response) {
    try {
      const { id } = req.params; // Mesa principal
      const { targetTableId } = req.body; // Mesa secundaria que se une

      if (!targetTableId) {
        return res.status(400).json({ error: 'Debes seleccionar la mesa que deseas unir.' });
      }

      if (id === targetTableId) {
        return res.status(400).json({ error: 'No puedes unir una mesa consigo misma.' });
      }

      const mainTable = await prisma.table.findUnique({
        where: { id },
        include: { orders: { where: { paymentStatus: PaymentStatus.PENDING } } },
      });
      const targetTable = await prisma.table.findUnique({
        where: { id: targetTableId },
        include: { orders: { where: { paymentStatus: PaymentStatus.PENDING } } },
      });

      if (!mainTable || !targetTable) {
        return res.status(404).json({ error: 'Una de las mesas no fue encontrada.' });
      }

      if (targetTable.orders.length > 0 || targetTable.status === TableStatus.WAITING_BILL) {
        return res.status(400).json({
          error: `La Mesa ${targetTable.number} tiene comandas activas pendientes de pago. Debe cobrarse antes de unirla.`,
        });
      }

      if (targetTable.status === TableStatus.MERGED) {
        return res.status(400).json({
          error: `La Mesa ${targetTable.number} ya se encuentra unida a otra mesa.`,
        });
      }

      if (mainTable.status === TableStatus.MERGED) {
        return res.status(400).json({
          error: `La Mesa ${mainTable.number} está unida a otra mesa. Realiza la unión desde la mesa principal.`,
        });
      }

      await prisma.$transaction(async (tx) => {
        // La mesa objetivo pasa a estado MERGED y queda vinculada a la principal
        await tx.table.update({
          where: { id: targetTableId },
          data: {
            status: TableStatus.MERGED,
            mergedIntoId: id,
          },
        });

        // Si la mesa principal estaba AVAILABLE, la pasamos a OCCUPIED
        if (mainTable.status === TableStatus.AVAILABLE) {
          await tx.table.update({
            where: { id },
            data: { status: TableStatus.OCCUPIED },
          });
        }
      });

      io.to('room:waiters').emit('tables:updated');

      return res.status(200).json({
        message: `Mesa ${targetTable.number} unida con éxito a Mesa ${mainTable.number}.`,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Desunir mesas
  static async unmergeTable(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const table = await prisma.table.findUnique({
        where: { id },
        include: { mergedTables: true },
      });

      if (!table) {
        return res.status(404).json({ error: 'Mesa no encontrada.' });
      }

      await prisma.$transaction(async (tx) => {
        if (table.mergedIntoId) {
          // Desunir solo esta mesa secundaria
          await tx.table.update({
            where: { id },
            data: { status: TableStatus.AVAILABLE, mergedIntoId: null },
          });
        } else if (table.mergedTables.length > 0) {
          // Es la mesa principal: liberar todas las mesas que tenía unidas
          await tx.table.updateMany({
            where: { mergedIntoId: id },
            data: { status: TableStatus.AVAILABLE, mergedIntoId: null },
          });
        }
      });

      io.to('room:waiters').emit('tables:updated');

      return res.status(200).json({ message: 'Mesas desunidas con éxito.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Cobrar toda la mesa (liquida todas las órdenes pendientes de esa mesa y la libera)
  static async payTable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tipAmount = 0, paymentMethod = 'EFECTIVO' } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const table = await tx.table.findUnique({
          where: { id },
          include: {
            orders: {
              where: {
                paymentStatus: PaymentStatus.PENDING,
                status: { not: OrderStatus.CANCELLED },
              },
            },
          },
        });

        if (!table) throw new Error('Mesa no encontrada.');
        if (table.orders.length === 0) {
          // Si no tiene órdenes pendientes pero quedó ocupada, la liberamos
          await tx.table.update({
            where: { id },
            data: { status: TableStatus.AVAILABLE },
          });
          // Liberar mesas secundarias unidas
          await tx.table.updateMany({
            where: { mergedIntoId: id },
            data: { status: TableStatus.AVAILABLE, mergedIntoId: null },
          });
          return { message: 'Mesa liberada.' };
        }

        // Marcar todas las órdenes de la mesa como PAGADAS
        const tipNum = Number(tipAmount || 0);

        for (let i = 0; i < table.orders.length; i++) {
          const ord = table.orders[i];
          const isLast = i === table.orders.length - 1;
          const assignedTip = isLast ? tipNum : 0;
          const subtotalNum = Number(ord.subtotal);

          await tx.order.update({
            where: { id: ord.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              status: OrderStatus.DELIVERED,
              tipAmount: assignedTip,
              total: subtotalNum + assignedTip,
              paymentMethod: paymentMethod || 'EFECTIVO',
              paidAt: new Date(),
            },
          });
        }

        // Liberar la mesa principal a DISPONIBLE (Verde)
        await tx.table.update({
          where: { id },
          data: { status: TableStatus.AVAILABLE },
        });

        // Liberar automáticamente todas las mesas que estaban unidas a esta
        await tx.table.updateMany({
          where: { mergedIntoId: id },
          data: { status: TableStatus.AVAILABLE, mergedIntoId: null },
        });

        return { message: 'Mesa cobrada y liberada con éxito.' };
      });

      // Notificar a meseros de la liberación en tiempo real
      io.to('room:waiters').emit('table:status_changed', {
        tableId: id,
        status: TableStatus.AVAILABLE,
      });
      io.to('room:waiters').emit('tables:updated');

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Crear una nueva mesa (Admin)
  static async createTable(req: Request, res: Response) {
    try {
      let { number, capacity = 4 } = req.body;

      if (!number) {
        const maxTable = await prisma.table.findFirst({
          where: { isActive: true },
          orderBy: { number: 'desc' },
        });
        number = maxTable ? maxTable.number + 1 : 1;
      } else {
        number = Number(number);
        const existing = await prisma.table.findFirst({
          where: { number, isActive: true },
        });
        if (existing) {
          return res.status(400).json({ error: `La Mesa ${number} ya existe.` });
        }
      }

      const inactiveTable = await prisma.table.findUnique({
        where: { number },
      });

      let createdTable;
      if (inactiveTable) {
        createdTable = await prisma.table.update({
          where: { id: inactiveTable.id },
          data: {
            capacity: Number(capacity) || 4,
            status: TableStatus.AVAILABLE,
            isActive: true,
            posX: 10,
            posY: 10,
          },
        });
      } else {
        createdTable = await prisma.table.create({
          data: {
            number,
            capacity: Number(capacity) || 4,
            status: TableStatus.AVAILABLE,
            isActive: true,
            posX: 10,
            posY: 10,
          },
        });
      }

      io.to('room:waiters').emit('tables:updated');
      return res.status(201).json(createdTable);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Actualizar capacidad o número de mesa (Admin)
  static async updateTable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { number, capacity } = req.body;

      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) return res.status(404).json({ error: 'Mesa no encontrada.' });

      if (number && Number(number) !== table.number) {
        const existing = await prisma.table.findFirst({
          where: { number: Number(number), isActive: true, id: { not: id } },
        });
        if (existing) {
          return res.status(400).json({ error: `Ya existe otra mesa con el número ${number}.` });
        }
      }

      const updated = await prisma.table.update({
        where: { id },
        data: {
          ...(number && { number: Number(number) }),
          ...(capacity && { capacity: Number(capacity) }),
        },
      });

      io.to('room:waiters').emit('tables:updated');
      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Eliminar mesa (Admin)
  static async deleteTable(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const table = await prisma.table.findUnique({
        where: { id },
        include: {
          orders: { where: { paymentStatus: PaymentStatus.PENDING } },
          mergedTables: true,
        },
      });

      if (!table) return res.status(404).json({ error: 'Mesa no encontrada.' });

      if (table.status === TableStatus.OCCUPIED || table.status === TableStatus.WAITING_BILL) {
        return res.status(400).json({
          error: `No puedes eliminar la Mesa ${table.number} porque se encuentra ocupada o por cobrar.`,
        });
      }

      if (table.status === TableStatus.MERGED) {
        return res.status(400).json({
          error: `La Mesa ${table.number} está unida a otra mesa. Desúnela primero.`,
        });
      }

      if (table.mergedTables.length > 0) {
        await prisma.table.updateMany({
          where: { mergedIntoId: id },
          data: { status: TableStatus.AVAILABLE, mergedIntoId: null },
        });
      }

      const ordersCount = await prisma.order.count({ where: { tableId: id } });

      if (ordersCount > 0) {
        await prisma.table.update({
          where: { id },
          data: {
            isActive: false,
            number: -(table.number * 1000 + Math.floor(Math.random() * 900)),
          },
        });
      } else {
        await prisma.table.delete({ where: { id } });
      }

      io.to('room:waiters').emit('tables:updated');
      return res.status(200).json({ message: `Mesa ${table.number} eliminada con éxito.` });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
