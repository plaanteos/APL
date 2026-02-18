import nodemailer from 'nodemailer';
import logger from '../utils/logger';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>;
}

class EmailService {
  private createStatusError(message: string, statusCode: number) {
    const err: any = new Error(message);
    err.statusCode = statusCode;
    return err as Error;
  }

  private isResendEnabled() {
    return !!process.env.RESEND_API_KEY;
  }

  private normalizeEnvValue(raw: string | undefined) {
    if (!raw) return { value: '', changed: false };
    const trimmed = raw.trim();
    const unquoted = trimmed
      .replace(/^"(.+)"$/, '$1')
      .replace(/^'(.+)'$/, '$1')
      .trim();
    return { value: unquoted, changed: unquoted !== raw };
  }

  private createTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = port === 465;

    const user = process.env.SMTP_USER;
    const passRaw = process.env.SMTP_PASS;
    const pass = (passRaw || '').replace(/\s+/g, '');

    if (!user || !pass) {
      throw new Error('SMTP_USER/SMTP_PASS no están configurados');
    }

    if (passRaw && passRaw !== pass) {
      logger.warn('⚠️ SMTP_PASS contenía espacios; se normalizó automáticamente.');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      // Evitar que el request quede colgado indefinidamente si el proveedor bloquea SMTP
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  private async sendEmailViaResend(options: EmailOptions): Promise<void> {
    const apiKeyRaw = process.env.RESEND_API_KEY;
    const apiKeyNorm = this.normalizeEnvValue(apiKeyRaw);
    const apiKey = apiKeyNorm.value;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está configurado');
    }
    if (apiKeyNorm.changed) {
      logger.warn('⚠️ RESEND_API_KEY contenía espacios/comillas; se normalizó automáticamente.');
    }

    const fromRaw = process.env.EMAIL_FROM;
    const fromNorm = this.normalizeEnvValue(fromRaw);
    const from = fromNorm.value;
    if (!from) {
      throw new Error('EMAIL_FROM no está configurado (requerido para Resend)');
    }
    if (fromNorm.changed) {
      logger.warn('⚠️ EMAIL_FROM contenía espacios/comillas; se normalizó automáticamente.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          ...(options.attachments?.length
            ? {
                attachments: options.attachments.map((a) => ({
                  filename: a.filename,
                  content: a.content.toString('base64'),
                  ...(a.contentType ? { content_type: a.contentType } : {}),
                })),
              }
            : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let detail = text || res.statusText;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.message) detail = parsed.message;
        } catch {
          // ignore
        }

        if (res.status === 401) {
          throw this.createStatusError(
            `Resend: API key inválida (revisá RESEND_API_KEY). Detalle: ${detail}`,
            401
          );
        }

        // Resend en modo testing: solo permite enviar a tu propio email hasta verificar dominio.
        if (
          res.status === 403 &&
          /only send testing emails to your own email address/i.test(detail)
        ) {
          throw this.createStatusError(
            `Resend: error (403). Tu cuenta está en modo testing: solo podés enviar a tu propio email. Verificá un dominio en Resend y usá un EMAIL_FROM de ese dominio. Detalle: ${detail}`,
            403
          );
        }

        throw this.createStatusError(`Resend: error (${res.status}). Detalle: ${detail}`, res.status);
      }

      const data: any = await res.json().catch(() => ({}));
      logger.info(`📧 Email enviado a ${options.to} (provider=resend id=${data?.id || 'n/a'})`);
    } catch (error: any) {
      // AbortController lanza AbortError
      if (error?.name === 'AbortError') {
        throw this.createStatusError('Resend request timeout', 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
      if (this.isResendEnabled()) {
        await this.sendEmailViaResend(options);
        return;
      }

      const transporter = this.createTransporter();

      const from = process.env.EMAIL_FROM || (process.env.SMTP_USER ? `"APL Laboratorio Dental" <${process.env.SMTP_USER}>` : 'APL Laboratorio Dental');

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.attachments?.length
          ? {
              attachments: options.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentType ? { contentType: a.contentType } : {}),
              })),
            }
          : {}),
      });
      const accepted = Array.isArray((info as any).accepted) ? (info as any).accepted.join(',') : '';
      const rejected = Array.isArray((info as any).rejected) ? (info as any).rejected.join(',') : '';
      logger.info(`📧 Email enviado a ${options.to} (provider=smtp messageId=${(info as any).messageId || 'n/a'} accepted=${accepted || 'n/a'} rejected=${rejected || 'n/a'})`);
        } catch (error: any) {
      logger.error('❌ Error enviando email:', error);
      const baseMsg = 'No se pudo enviar el email';
      const msg = String(error?.message || '');
      const statusCode = error?.statusCode || error?.status;
      // Mensajes "seguros" para mostrar en producción cuando es un problema de configuración.
      const isSafeConfigError = msg.startsWith('Resend:') || msg === 'RESEND_API_KEY no está configurado' || msg.startsWith('EMAIL_FROM no está configurado');

      if (process.env.NODE_ENV === 'development' || isSafeConfigError) {
        const wrapped: any = new Error(`${baseMsg}: ${error?.message || 'error desconocido'}`);
        if (statusCode) wrapped.statusCode = statusCode;
        throw wrapped;
      }
      const wrapped: any = new Error(baseMsg);
      if (statusCode) wrapped.statusCode = statusCode;
      throw wrapped;
        }
    }

    async sendPasswordResetEmail(email: string, token: string): Promise<void> {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL no está configurado');
      }

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #033f63;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #033f63;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en APL Laboratorio Dental.</p>
              <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #033f63;">${resetUrl}</p>
              <p><strong>Este enlace expirará en 1 hora.</strong></p>
              <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} APL Laboratorio Dental. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

        await this.sendEmail({
            to: email,
            subject: 'Recuperación de Contraseña - APL Laboratorio Dental',
            html,
        });
    }

    async sendPasswordResetCodeEmail(email: string, code: string, expiresInMinutes: number = 15): Promise<void> {
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #033f63; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .code { font-size: 32px; letter-spacing: 6px; font-weight: bold; color: #033f63; text-align: center; padding: 14px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en APL Laboratorio Dental.</p>
              <p>Usá este código de verificación para continuar:</p>
              <div class="code">${code}</div>
              <p><strong>Este código expira en ${expiresInMinutes} minutos.</strong></p>
              <p>Si no solicitaste restablecer tu contraseña, podés ignorar este correo de forma segura.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} APL Laboratorio Dental. Todos los derechos reservados.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

        await this.sendEmail({
            to: email,
            subject: 'Código de recuperación de contraseña - APL Laboratorio Dental',
            html,
        });
    }
}

export const emailService = new EmailService();
