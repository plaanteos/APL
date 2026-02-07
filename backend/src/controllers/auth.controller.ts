import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Prisma, PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';
import { passwordSchema } from '../utils/passwordPolicy';
import { authenticator } from 'otplib';
import {
  consumeBackupCode,
  generateBackupCodes,
  getTwoFactorIssuer,
  hashBackupCodes,
  normalizeOtp,
  verifyTotp,
} from '../utils/twoFactor';

const prisma = new PrismaClient();

// Schemas de validación
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  // No aplicar política estricta en login para no bloquear usuarios legacy.
  password: z.string().min(1, 'Contraseña requerida'),
  // 2FA (opcional). Solo aplica si el usuario lo tiene habilitado.
  otp: z.string().min(6).max(10).optional(),
  backupCode: z.string().min(6).max(32).optional(),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  usuario: z.string().min(3, 'Usuario debe tener al menos 3 caracteres'),
  password: passwordSchema('Contraseña'),
  nombre: z.string().min(2, 'Nombre requerido'),
  telefono: z.string().optional(),
  super_usuario: z.boolean().default(false),
});

// Generar JWT token
const generateToken = (userId: number, email: string, superUsuario: boolean): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(
    { id: userId, email, super_usuario: superUsuario },
    secret,
    { expiresIn: '15m' } // Access token: 15 minutos
  );
};

// Generar Refresh Token
const generateRefreshToken = (userId: number, email: string, superUsuario: boolean): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(
    { id: userId, email, super_usuario: superUsuario, type: 'refresh' },
    secret,
    { expiresIn: '7d' } // Refresh token: 7 días
  );
};

export class AuthController {
  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      // Validar entrada
      const { email, password, otp, backupCode } = loginSchema.parse(req.body);

      // Buscar usuario
      const user = await prisma.administrador.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          usuario: true,
          password: true,
          nombre: true,
          telefono: true,
          super_usuario: true,
          activo: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true,
        },
      });

      if (!user || !user.activo) {
        // Registrar intento fallido en auditoría
        await AuditService.log(
          'sistema',
          `Intento de login fallido: usuario no existe o inactivo - ${email} desde ${req.ip || 'IP desconocida'}`
        );

        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Registrar intento fallido en auditoría
        await AuditService.log(
          user.usuario,
          `Intento de login fallido: contraseña incorrecta - ${email} desde ${req.ip || 'IP desconocida'}`
        );

        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
      }

      // 2FA: si el usuario lo tiene habilitado, requerir OTP o backup code
      if (user.twoFactorEnabled) {
        if (!user.twoFactorSecret) {
          await AuditService.log(
            user.usuario,
            `2FA_INCONSISTENT - Usuario con 2FA habilitado pero sin secreto (id=${user.id})`
          );

          return res.status(500).json({
            success: false,
            error: 'Configuración 2FA inválida. Contacte al administrador.',
          });
        }

        const hasOtp = typeof otp === 'string' && otp.trim().length > 0;
        const hasBackup = typeof backupCode === 'string' && backupCode.trim().length > 0;

        if (!hasOtp && !hasBackup) {
          return res.status(401).json({
            success: false,
            error: 'Se requiere código 2FA',
            requires2fa: true,
          });
        }

        if (hasOtp) {
          const ok = verifyTotp(user.twoFactorSecret, otp!);
          if (!ok) {
            await AuditService.log(
              user.usuario,
              `2FA_LOGIN_FAILED - OTP inválido para ${email} desde ${req.ip || 'IP desconocida'}`
            );
            return res.status(401).json({
              success: false,
              error: 'Código 2FA inválido',
              requires2fa: true,
            });
          }
        } else {
          const stored = user.twoFactorBackupCodes as any;
          const hashedCodes: string[] = Array.isArray(stored) ? stored : Array.isArray(stored?.codes) ? stored.codes : [];

          const { ok, remaining } = await consumeBackupCode(backupCode!.trim(), hashedCodes);
          if (!ok) {
            await AuditService.log(
              user.usuario,
              `2FA_LOGIN_FAILED - Backup code inválido para ${email} desde ${req.ip || 'IP desconocida'}`
            );
            return res.status(401).json({
              success: false,
              error: 'Código de respaldo inválido',
              requires2fa: true,
            });
          }

          await prisma.administrador.update({
            where: { id: user.id },
            data: { twoFactorBackupCodes: remaining as any },
          });
        }
      }

      // Generar token
      const token = generateToken(user.id, user.email, user.super_usuario);
      const refreshToken = generateRefreshToken(user.id, user.email, user.super_usuario);

      // Guardar refresh token en BD
      await prisma.administrador.update({
        where: { id: user.id },
        data: { refreshToken: await bcrypt.hash(refreshToken, 10) }
      });

      // Registrar login en auditoría
      await AuditService.logLogin(req, user.usuario, user.email);

      // Responder sin contraseña
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          refreshToken,
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

  // POST /api/auth/2fa/setup (requiere autenticación)
  static async setupTwoFactor(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'No autenticado' });
      }

      const user = await prisma.administrador.findUnique({
        where: { id: userId },
        select: { id: true, email: true, usuario: true, activo: true, twoFactorEnabled: true },
      });

      if (!user || !user.activo) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      // Generar secreto TOTP
      const secret = authenticator.generateSecret();
      const issuer = getTwoFactorIssuer();
      const label = user.email || user.usuario;
      const otpauthUrl = authenticator.keyuri(label, issuer, secret);

      await prisma.administrador.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret,
          twoFactorEnabled: false,
          twoFactorBackupCodes: Prisma.DbNull,
        },
      });

      await AuditService.log(user.usuario, '2FA_SETUP_CREATED - Se generó secreto 2FA (pendiente habilitar)');

      return res.json({
        success: true,
        data: {
          issuer,
          label,
          secret,
          otpauthUrl,
        },
      });
    } catch (error) {
      console.error('2FA setup error:', error);
      return res.status(500).json({ success: false, error: 'Error al iniciar configuración 2FA' });
    }
  }

  // POST /api/auth/2fa/enable (requiere autenticación)
  static async enableTwoFactor(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'No autenticado' });
      }

      const { otp } = z.object({ otp: z.string().min(6).max(10) }).parse(req.body);

      const user = await prisma.administrador.findUnique({
        where: { id: userId },
        select: { id: true, usuario: true, activo: true, twoFactorSecret: true },
      });

      if (!user || !user.activo) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      if (!user.twoFactorSecret) {
        return res.status(400).json({ success: false, error: 'Primero ejecutá el setup de 2FA' });
      }

      const ok = verifyTotp(user.twoFactorSecret, otp);
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Código 2FA inválido' });
      }

      const backupCodes = generateBackupCodes(10);
      const hashed = await hashBackupCodes(backupCodes);

      await prisma.administrador.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: hashed as any,
        },
      });

      await AuditService.log(user.usuario, '2FA_ENABLED - 2FA habilitado');

      return res.json({
        success: true,
        message: '2FA habilitado correctamente',
        data: {
          backupCodes,
        },
      });
    } catch (error: any) {
      console.error('2FA enable error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues[0]?.message || 'Datos inválidos' });
      }
      return res.status(500).json({ success: false, error: 'Error al habilitar 2FA' });
    }
  }

  // POST /api/auth/2fa/disable (requiere autenticación)
  static async disableTwoFactor(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'No autenticado' });
      }

      const { password, otp, backupCode } = z
        .object({
          password: z.string().min(1, 'Contraseña requerida'),
          otp: z.string().min(6).max(10).optional(),
          backupCode: z.string().min(6).max(32).optional(),
        })
        .parse(req.body);

      const user = await prisma.administrador.findUnique({
        where: { id: userId },
        select: {
          id: true,
          usuario: true,
          activo: true,
          password: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          twoFactorBackupCodes: true,
        },
      });

      if (!user || !user.activo) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ success: false, error: '2FA no está habilitado' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ success: false, error: 'Contraseña incorrecta' });
      }

      const hasOtp = typeof otp === 'string' && otp.trim().length > 0;
      const hasBackup = typeof backupCode === 'string' && backupCode.trim().length > 0;

      if (!hasOtp && !hasBackup) {
        return res.status(400).json({ success: false, error: 'Debés proveer OTP o un código de respaldo' });
      }

      if (hasOtp) {
        const ok = verifyTotp(user.twoFactorSecret, otp!);
        if (!ok) return res.status(400).json({ success: false, error: 'Código 2FA inválido' });
      } else {
        const stored = user.twoFactorBackupCodes as any;
        const hashedCodes: string[] = Array.isArray(stored) ? stored : Array.isArray(stored?.codes) ? stored.codes : [];
        const { ok } = await consumeBackupCode(backupCode!.trim(), hashedCodes);
        if (!ok) return res.status(400).json({ success: false, error: 'Código de respaldo inválido' });
      }

      await prisma.administrador.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: Prisma.DbNull,
        },
      });

      await AuditService.log(user.usuario, '2FA_DISABLED - 2FA deshabilitado');

      return res.json({ success: true, message: '2FA deshabilitado' });
    } catch (error: any) {
      console.error('2FA disable error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues[0]?.message || 'Datos inválidos' });
      }
      return res.status(500).json({ success: false, error: 'Error al deshabilitar 2FA' });
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
            { usuario: userData.usuario },
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

      // Preparar datos (eliminar undefined)
      const adminData: any = {
        email: userData.email,
        usuario: userData.usuario,
        password: hashedPassword,
        nombre: userData.nombre,
        super_usuario: userData.super_usuario,
      };

      // Solo agregar telefono si está definido
      if (userData.telefono) {
        adminData.telefono = userData.telefono;
      }

      // Crear usuario
      const newUser = await prisma.administrador.create({
        data: adminData,
        select: {
          id: true,
          email: true,
          usuario: true,
          nombre: true,
          telefono: true,
          super_usuario: true,
          createdAt: true,
        },
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
          usuario: true,
          nombre: true,
          telefono: true,
          super_usuario: true,
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

      // Validar política de contraseña
      try {
        passwordSchema('La nueva contraseña').parse(newPassword);
      } catch (e) {
        if (e instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: e.issues[0]?.message || 'La nueva contraseña no cumple la política de seguridad',
          });
        }
        throw e;
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

  // POST /api/auth/refresh - Refrescar access token con refresh token
  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token requerido',
        });
      }

      // Verificar refresh token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }

      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, secret);
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token inválido o expirado',
        });
      }

      // Verificar que sea un refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: 'Token inválido',
        });
      }

      // Buscar usuario y verificar refresh token almacenado
      const user = await prisma.administrador.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          super_usuario: true,
          activo: true,
          refreshToken: true,
        },
      });

      if (!user || !user.activo || !user.refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autorizado',
        });
      }

      // Verificar que el refresh token coincida con el almacenado
      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isRefreshTokenValid) {
        return res.status(401).json({
          success: false,
          error: 'Refresh token inválido',
        });
      }

      // Generar nuevo access token
      const newAccessToken = generateToken(user.id, user.email, user.super_usuario);

      // Registrar renovación en auditoría
      await AuditService.log(
        user.email,
        `Token de acceso renovado desde ${req.ip || 'IP desconocida'}`
      );

      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        data: {
          token: newAccessToken,
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/auth/logout - Invalidar refresh token
  static async logout(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado',
        });
      }

      // Invalidar refresh token en BD
      await prisma.administrador.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      // Registrar logout en auditoría
      const usuario = (req as any).user?.usuario || (req as any).user?.email || 'usuario';
      await AuditService.logLogout(
        usuario,
        (req as any).user?.email
      );

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * Solicitar recuperación de contraseña
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = z.object({
        email: z.string().email('Email inválido'),
      }).parse(req.body);

      // Buscar usuario por email
      const user = await prisma.administrador.findUnique({
        where: { email },
      });

      // Por seguridad, siempre devolver el mismo mensaje
      const successMessage = 'Si el email existe, recibirás un enlace de recuperación';

      if (!user || !user.activo) {
        return res.status(200).json({ success: true, message: successMessage });
      }

      // Generar token de reset (válido por 1 hora)
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const resetToken = jwt.sign(
        { id: user.id, email: user.email, type: 'password-reset' },
        secret,
        { expiresIn: '1h' }
      );

      // Guardar hash del token y fecha de expiración
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.administrador.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpiry: resetExpiry,
        },
      });

      // Enviar notificación(es). Por seguridad, nunca fallar la respuesta por errores de envío.
      // Email (Gmail/SMTP)
      try {
        const { emailService } = await import('../services/email.service');
        await emailService.sendPasswordResetEmail(email, resetToken);
      } catch (sendError) {
        console.error('Forgot password: error enviando email:', sendError);
      }

      // WhatsApp (opcional)
      try {
        const shouldSendWhatsApp = (process.env.PASSWORD_RESET_SEND_WHATSAPP || '').toLowerCase() === 'true';
        if (shouldSendWhatsApp && user.telefono && process.env.FRONTEND_URL) {
          const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
          const { whatsappService } = await import('../services/whatsapp.service');
          await whatsappService.sendTextMessage({
            to: user.telefono,
            body: `Recuperación de contraseña APL. Usá este enlace (expira en 1 hora): ${resetUrl}`,
          });
        }
      } catch (sendError) {
        console.error('Forgot password: error enviando WhatsApp:', sendError);
      }

      await AuditService.log(
        user.usuario,
        `PASSWORD_RESET_REQUESTED - Solicitud de recuperación para ${email}`
      );

      return res.status(200).json({ success: true, message: successMessage });
    } catch (error: any) {
      console.error('Forgot password error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.issues[0].message
        });
      }

      // Mantener respuesta consistente para evitar filtración de información
      return res.status(200).json({ success: true, message: 'Si el email existe, recibirás un enlace de recuperación' });
    }
  }

  /**
   * Restablecer contraseña con token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = z.object({
        token: z.string().min(1, 'Token requerido'),
        newPassword: passwordSchema('La contraseña'),
      }).parse(req.body);

      // Verificar token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, secret);
      } catch (jwtError) {
        return res.status(400).json({ success: false, error: 'Token inválido o expirado' });
      }

      if (decoded.type !== 'password-reset') {
        return res.status(400).json({ success: false, error: 'Token inválido' });
      }

      const user = await prisma.administrador.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.activo) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }

      if (!user.resetPasswordToken || !user.resetPasswordExpiry) {
        return res.status(400).json({ success: false, error: 'Token inválido' });
      }

      if (new Date() > user.resetPasswordExpiry) {
        return res.status(400).json({ success: false, error: 'Token expirado' });
      }

      const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);
      if (!isValidToken) {
        return res.status(400).json({ success: false, error: 'Token inválido' });
      }

      // Actualizar contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.administrador.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpiry: null,
        },
      });

      await AuditService.log(
        user.usuario,
        `PASSWORD_RESET_COMPLETED - Contraseña restablecida para ${user.email}`
      );

      return res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: error.issues[0].message
        });
      }

      return res.status(500).json({ success: false, error: 'Error al restablecer contraseña' });
    }
  }
}
