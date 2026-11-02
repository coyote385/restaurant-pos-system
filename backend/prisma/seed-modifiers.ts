import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🍔 Creando grupos de modificadores y adicionales...');

  // 1. Grupo: Término de la Carne (Obligatorio, Selección Única)
  const groupTermino = await prisma.modifierGroup.create({
    data: {
      name: 'Término de la Carne',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: {
        create: [
          { name: 'Término Medio (1/2)', price: 0 },
          { name: 'Tres Cuartos (3/4)', price: 0 },
          { name: 'Bien Asada', price: 0 },
        ],
      },
    },
  });

  // 2. Grupo: Adicionales para Hamburguesas / Carnes (Opcional, Selección Múltiple con Costo)
  const groupExtrasBurger = await prisma.modifierGroup.create({
    data: {
      name: 'Adicionales / Toppings',
      minSelect: 0,
      maxSelect: 4,
      isRequired: false,
      options: {
        create: [
          { name: 'Tocineta Ahumada', price: 4000 },
          { name: 'Queso Cheddar Extra', price: 3000 },
          { name: 'Huevo Frito', price: 2500 },
          { name: 'Pepinillos Dulces', price: 1500 },
        ],
      },
    },
  });

  // 3. Grupo: Guarnición / Acompañamiento (Obligatorio, Selección Única)
  const groupGuarnicion = await prisma.modifierGroup.create({
    data: {
      name: 'Acompañamiento Incluido',
      minSelect: 1,
      maxSelect: 1,
      isRequired: true,
      options: {
        create: [
          { name: 'Papas a la Francesa', price: 0 },
          { name: 'Papas Rústicas', price: 1000 },
          { name: 'Ensalada Mixta de la Casa', price: 0 },
          { name: 'Aros de Cebolla', price: 2000 },
        ],
      },
    },
  });

  // 4. Grupo: Personalización de Bebidas
  const groupBebidas = await prisma.modifierGroup.create({
    data: {
      name: 'Preferencia de Bebida',
      minSelect: 0,
      maxSelect: 2,
      isRequired: false,
      options: {
        create: [
          { name: 'Sin Azúcar', price: 0 },
          { name: 'Con Mucho Hielo', price: 0 },
          { name: 'Sin Hielo', price: 0 },
        ],
      },
    },
  });

  console.log('✅ Grupos creados.');

  // Asociar con productos existentes
  const burger = await prisma.product.findFirst({ where: { name: { contains: 'Hamburguesa' } } });
  if (burger) {
    await prisma.productModifierGroup.createMany({
      data: [
        { productId: burger.id, groupId: groupTermino.id },
        { productId: burger.id, groupId: groupExtrasBurger.id },
        { productId: burger.id, groupId: groupGuarnicion.id },
      ],
    });
    console.log(`✅ Modificadores asociados a: ${burger.name}`);
  }

  const ribs = await prisma.product.findFirst({ where: { name: { contains: 'Costillas' } } });
  if (ribs) {
    await prisma.productModifierGroup.createMany({
      data: [
        { productId: ribs.id, groupId: groupGuarnicion.id },
        { productId: ribs.id, groupId: groupExtrasBurger.id },
      ],
    });
    console.log(`✅ Modificadores asociados a: ${ribs.name}`);
  }

  // Asociar bebidas
  const bebidas = await prisma.product.findMany({
    where: { category: { name: 'Bebidas' } },
  });
  for (const b of bebidas) {
    await prisma.productModifierGroup.create({
      data: { productId: b.id, groupId: groupBebidas.id },
    }).catch(() => {});
  }
  console.log('✅ Modificadores asociados a Bebidas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
