import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Role, TableStatus } from '../src/types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos iniciales en SQLite...');

  // Limpiar datos existentes
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();

  // 1. Usuarios
  const adminPass = await bcrypt.hash('admin123', 10);
  const pin1234 = await bcrypt.hash('1234', 10);
  const pin5678 = await bcrypt.hash('5678', 10);

  await prisma.user.create({
    data: {
      name: 'Gerente General',
      email: 'admin@restaurante.com',
      passwordHash: adminPass,
      role: Role.ADMIN,
      documentId: '100100100',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Carlos Mesero',
      documentId: '1020304050',
      pinCodeHash: pin1234,
      role: Role.WAITER,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Laura Mesera',
      documentId: '1098765432',
      pinCodeHash: pin5678,
      role: Role.WAITER,
    },
  });

  console.log('✅ Usuarios creados: Admin y 2 Meseros (PINs: 1234 y 5678)');

  // 2. Mesas
  for (let i = 1; i <= 8; i++) {
    await prisma.table.create({
      data: {
        number: i,
        capacity: i % 2 === 0 ? 4 : 2,
        status: TableStatus.AVAILABLE,
      },
    });
  }
  console.log('✅ 8 Mesas creadas (todas disponibles)');

  // 3. Categorías
  const catEntradas = await prisma.category.create({
    data: { name: 'Entradas', sortOrder: 1 },
  });
  const catFuertes = await prisma.category.create({
    data: { name: 'Platos Fuertes', sortOrder: 2 },
  });
  const catBebidas = await prisma.category.create({
    data: { name: 'Bebidas', sortOrder: 3 },
  });

  // 4. Productos
  await prisma.product.createMany({
    data: [
      { name: 'Empanadas de Carne (3 uds)', price: 12000, categoryId: catEntradas.id, isAvailable: true },
      { name: 'Ceviche Mixto', price: 22000, categoryId: catEntradas.id, isAvailable: true },
      { name: 'Hamburguesa Artesanal', price: 28000, categoryId: catFuertes.id, isAvailable: true },
      { name: 'Costillas BBQ', price: 38000, categoryId: catFuertes.id, isAvailable: true },
      { name: 'Pizza Margarita', price: 26000, categoryId: catFuertes.id, isAvailable: true },
      { name: 'Limonada de Coco', price: 9000, categoryId: catBebidas.id, isAvailable: true },
      { name: 'Cerveza Club Colombia', price: 8000, categoryId: catBebidas.id, isAvailable: true },
      { name: 'Gaseosa Postobón', price: 5000, categoryId: catBebidas.id, isAvailable: true },
    ],
  });
  console.log('✅ Categorías y productos creados correctamente en SQLite');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
