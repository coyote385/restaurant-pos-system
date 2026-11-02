import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma';
import { Role } from '../../types/enums';

export interface CreateUserData {
  name: string;
  documentId?: string;
  pin?: string;
  role: Role;
  email?: string;
  password?: string;
}

export class UserService {
  static async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        documentId: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            shifts: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  static async createUser(data: CreateUserData) {
    const { name, documentId, pin, role, email, password } = data;

    if (!name || name.trim().length === 0) {
      throw new Error('El nombre es obligatorio.');
    }

    if (!Object.values(Role).includes(role)) {
      throw new Error('El rol proporcionado no es válido.');
    }

    // Validación de documento único
    if (documentId && documentId.trim()) {
      const existingDoc = await prisma.user.findUnique({
        where: { documentId: documentId.trim() },
      });
      if (existingDoc) {
        throw new Error(`Ya existe un usuario con el documento ${documentId}.`);
      }
    }

    // Validación de email único para ADMIN
    if (email && email.trim()) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingEmail) {
        throw new Error(`El correo ${email} ya está registrado.`);
      }
    }

    let pinCodeHash: string | null = null;
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        throw new Error('El PIN debe contener entre 4 y 6 dígitos numéricos.');
      }

      // Validar que ningún usuario activo tenga este mismo PIN para evitar conflictos en el teclado
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, pinCodeHash: true },
      });

      for (const u of activeUsers) {
        if (u.pinCodeHash && (await bcrypt.compare(pin, u.pinCodeHash))) {
          throw new Error(`El PIN ya está en uso por el colaborador ${u.name}. Asigna un PIN diferente.`);
        }
      }

      pinCodeHash = await bcrypt.hash(pin, 10);
    } else if (role === Role.WAITER) {
      throw new Error('Se requiere un PIN para registrar a un mesero.');
    }

    let passwordHash: string | null = null;
    if (password) {
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }
      passwordHash = await bcrypt.hash(password, 10);
    } else if (role === Role.ADMIN) {
      throw new Error('Se requiere una contraseña para registrar un administrador.');
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        documentId: documentId?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        pinCodeHash,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        documentId: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return newUser;
  }

  static async toggleUserStatus(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    // Si es admin y se quiere desactivar, verificar que no sea el único admin activo
    if (user.role === Role.ADMIN && user.isActive) {
      const activeAdminsCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });
      if (activeAdminsCount <= 1) {
        throw new Error('No puedes desactivar al único administrador activo del sistema.');
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
        role: true,
      },
    });

    return updated;
  }

  static async updatePin(id: string, newPin: string) {
    if (!/^\d{4,6}$/.test(newPin)) {
      throw new Error('El PIN debe contener entre 4 y 6 dígitos numéricos.');
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      throw new Error('Usuario no encontrado.');
    }

    // Verificar colisión de PIN con otros colaboradores activos
    const otherActiveUsers = await prisma.user.findMany({
      where: { isActive: true, id: { not: id } },
      select: { id: true, name: true, pinCodeHash: true },
    });

    for (const u of otherActiveUsers) {
      if (u.pinCodeHash && (await bcrypt.compare(newPin, u.pinCodeHash))) {
        throw new Error(`El PIN ya está en uso por el colaborador ${u.name}.`);
      }
    }

    const pinCodeHash = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { id },
      data: { pinCodeHash },
    });

    return { message: 'PIN actualizado exitosamente.' };
  }

  static async updateUser(id: string, data: { name?: string; documentId?: string; role?: Role }) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    if (data.documentId && data.documentId.trim() !== user.documentId) {
      const existing = await prisma.user.findUnique({
        where: { documentId: data.documentId.trim() },
      });
      if (existing) {
        throw new Error(`Ya existe un usuario con el documento ${data.documentId}.`);
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.documentId !== undefined && { documentId: data.documentId.trim() || null }),
        ...(data.role && { role: data.role }),
      },
      select: {
        id: true,
        name: true,
        documentId: true,
        role: true,
        isActive: true,
      },
    });
  }
}
