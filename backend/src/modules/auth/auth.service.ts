import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { Role } from '../../types/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_restaurant_key_2026';
const JWT_EXPIRES_IN = '12h';

export class AuthService {
  private static generateToken(user: { id: string; name: string; role: string; documentId?: string | null }) {
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        documentId: user.documentId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  static async waiterPinLogin(pin: string, documentId?: string) {
    if (!pin || pin.length < 4) {
      throw new Error('El PIN debe tener al menos 4 dígitos.');
    }

    let user = null;

    if (documentId) {
      user = await prisma.user.findFirst({
        where: { documentId, role: { in: [Role.WAITER, Role.KITCHEN, Role.CASHIER] }, isActive: true },
      });
      if (!user || !user.pinCodeHash) {
        throw new Error('Credenciales inválidas o colaborador no encontrado.');
      }
      const isPinValid = await bcrypt.compare(pin, user.pinCodeHash);
      if (!isPinValid) {
        throw new Error('PIN incorrecto.');
      }
    } else {
      const activePinUsers = await prisma.user.findMany({
        where: { role: { in: [Role.WAITER, Role.KITCHEN, Role.CASHIER] }, isActive: true },
      });

      for (const staff of activePinUsers) {
        if (staff.pinCodeHash && (await bcrypt.compare(pin, staff.pinCodeHash))) {
          user = staff;
          break;
        }
      }

      if (!user) {
        throw new Error('PIN incorrecto o colaborador inactivo.');
      }
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        documentId: user.documentId,
      },
    };
  }

  static async adminLogin(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== Role.ADMIN || !user.isActive || !user.passwordHash) {
      throw new Error('Credenciales inválidas o acceso no autorizado.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Contraseña incorrecta.');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
