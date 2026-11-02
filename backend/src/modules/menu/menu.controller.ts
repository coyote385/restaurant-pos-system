import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { io } from '../../sockets/socket.server';

export class MenuController {
  static async getCategories(_req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      return res.status(200).json(categories);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getProducts(req: Request, res: Response) {
    try {
      const { categoryId } = req.query;
      const where: any = {};
      if (categoryId) where.categoryId = String(categoryId);

      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          modifierGroups: {
            include: {
              group: {
                include: {
                  options: {
                    where: { isAvailable: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json(products);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const { name, description, price, categoryId } = req.body;
      if (!name || !price || !categoryId) {
        return res.status(400).json({ error: 'Nombre, precio y categoría son obligatorios.' });
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: Number(price),
          categoryId,
          isAvailable: true,
        },
        include: { category: true },
      });

      return res.status(201).json(product);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async toggleAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

      const updated = await prisma.product.update({
        where: { id },
        data: { isAvailable: !product.isAvailable },
      });

      // Notificar a todos los meseros en tiempo real
      io.to('room:waiters').emit('product:toggle_stock', {
        productId: updated.id,
        isAvailable: updated.isAvailable,
      });

      return res.status(200).json(updated);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
