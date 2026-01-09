import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';

const prisma = new PrismaClient();

// Schemas de validación
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string().min(3, 'Usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  nombres: z.string().min(2, 'Nombres requeridos'),
  apellidos: z.string().min(2, 'Apellidos requeridos'),
  telefono: z.string().optional(),
  rol: z.enum(['ADMIN', 'USUARIO']).default('USUARIO'),
});

// Generar JWT token
const generateToken = (userId: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(
    { id: userId, email, role },
    secret,
    { expiresIn: '7d' }
  );
};

export class AuthController {
  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      // Validar entrada
      const { email, password } = loginSchema.parse(req.body);

      // Buscar usuario
      const user = await prisma.administrador.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          username: true,
          password: true,
          nombres: true,
          apellidos: true,
          telefono: true,
          rol: true,
          activo: true,
        },
      });

      if (!user || !user.activo) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Generar token
      const token = generateToken(user.id, user.email, user.rol);

      // Registrar login en auditoría
      await AuditService.logLogin(req, user.id, user.email);

      // Responder sin contraseña
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          user: userWithoutPassword,
        }
      });
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      // Validar entrada
      const userData = registerSchema.parse(req.body);

      // Verificar si el usuario ya existe
      const existingUser = await prisma.administrador.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { username: userData.username },
          ],
        },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email o usuario ya registrado',
        });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Crear usuario
      const newUser = await prisma.administrador.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          username: true,
          nombres: true,
          apellidos: true,
          telefono: true,
          rol: true,
          createdAt: true,
        },
      });

      // Registrar creación en auditoría
      await AuditService.logCreate(req, 'administrador', newUser.id, {
        email: userData.email,
        username: userData.username,
        nombres: userData.nombres,
        apellidos: userData.apellidos
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: newUser,
      });
    } catch (error) {
      console.error('Register error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
  static async me(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Token inválido',
        });
      }

      const user = await prisma.administrador.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          nombres: true,
          apellidos: true,
          telefono: true,
          rol: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user || !user.activo) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Me error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
  static async logout(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (userId) {
        await AuditService.logLogout(req, userId);
      }

      res.json({
        success: true,
        message: 'Logout exitoso',
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PUT /api/auth/change-password
  static async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user?.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual y nueva contraseña son requeridas',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña debe tener al menos 6 caracteres',
        });
      }

      // Buscar usuario
      const user = await prisma.administrador.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual incorrecta',
        });
      }

      // Hash nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Actualizar contraseña
      await prisma.administrador.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      // Registrar cambio en auditoría
      await AuditService.logUpdate(req, 'administrador', userId, 
        { action: 'password_change' }, 
        { action: 'password_changed' },
        'Cambio de contraseña'
      );

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}