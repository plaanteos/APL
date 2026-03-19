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

  private isSendgridEnabled() {
    return !!process.env.SENDGRID_API_KEY;
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
      throw this.createStatusError('SMTP_USER/SMTP_PASS no están configurados', 500);
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

  private async sendEmailViaSendgrid(options: EmailOptions): Promise<void> {
    const apiKeyRaw = process.env.SENDGRID_API_KEY;
    const apiKeyNorm = this.normalizeEnvValue(apiKeyRaw);
    const apiKey = apiKeyNorm.value;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY no está configurado');
    }
    if (apiKeyNorm.changed) {
      logger.warn('⚠️ SENDGRID_API_KEY contenía espacios/comillas; se normalizó automáticamente.');
    }

    const fromRaw = process.env.EMAIL_FROM;
    const fromNorm = this.normalizeEnvValue(fromRaw);
    const from = fromNorm.value;
    if (!from) {
      throw new Error('EMAIL_FROM no está configurado (requerido para SendGrid)');
    }
    if (fromNorm.changed) {
      logger.warn('⚠️ EMAIL_FROM contenía espacios/comillas; se normalizó automáticamente.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      const payload: any = {
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: { email: from },
        content: [{ type: 'text/html', value: options.html }],
      };

      // Si EMAIL_FROM viene como "Nombre <email@dominio>", SendGrid no lo acepta en email.
      // Normalizamos en caso de formato display-name.
      const match = from.match(/<([^>]+)>/);
      if (match?.[1]) {
        payload.from.email = match[1].trim();
        payload.from.name = from.replace(match[0], '').replace(/^\s*"|"\s*$/g, '').trim() || undefined;
      }

      if (options.attachments?.length) {
        payload.attachments = options.attachments.map((a) => ({
          filename: a.filename,
          content: a.content.toString('base64'),
          type: a.contentType,
          disposition: 'attachment',
        }));
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let detail = text || res.statusText;
        try {
          const parsed = JSON.parse(text);
          // SendGrid suele devolver { errors: [{ message, field, help }] }
          const first = parsed?.errors?.[0]?.message;
          if (first) detail = first;
        } catch {
          // ignore
        }

        if (res.status === 401) {
          throw this.createStatusError(`SendGrid: API key inválida (revisá SENDGRID_API_KEY). Detalle: ${detail}`, 401);
        }

        if (res.status === 403) {
          throw this.createStatusError(
            `SendGrid: forbidden (403). Verificá el sender/"from" en SendGrid (Single Sender Verification o dominio). Detalle: ${detail}`,
            403
          );
        }

        throw this.createStatusError(`SendGrid: error (${res.status}). Detalle: ${detail}`, res.status);
      }

      logger.info(`📧 Email enviado a ${options.to} (provider=sendgrid)`);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw this.createStatusError('SendGrid request timeout', 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sendEmailViaSmtp(options: EmailOptions): Promise<void> {
    const transporter = this.createTransporter();

    const fromRaw = process.env.EMAIL_FROM;
    const fromNorm = this.normalizeEnvValue(fromRaw);
    let from = fromNorm.value;

    if (fromNorm.changed) {
      logger.warn('⚠️ EMAIL_FROM contenía espacios/comillas; se normalizó automáticamente.');
    }

    // Si viene con texto extra luego del cierre de ">", el header queda inválido.
    // Ej: "APL <a@b.com>a@b.com" -> recortar a "APL <a@b.com>".
    const gtIndex = from.indexOf('>');
    if (gtIndex !== -1 && from.slice(gtIndex + 1).trim().length > 0) {
      logger.warn('⚠️ EMAIL_FROM tenía texto extra luego de ">"; se recortó automáticamente.');
      from = from.slice(0, gtIndex + 1).trim();
    }

    if (!from) {
      from = process.env.SMTP_USER
        ? `"APL Laboratorio Dental" <${process.env.SMTP_USER}>`
        : 'APL Laboratorio Dental';
    }

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
    logger.info(
      `📧 Email enviado a ${options.to} (provider=smtp messageId=${(info as any).messageId || 'n/a'} accepted=${accepted || 'n/a'} rejected=${rejected || 'n/a'})`
    );
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (this.isResendEnabled()) {
        try {
          await this.sendEmailViaResend(options);
          return;
        } catch (resendError: any) {
          const statusCode = resendError?.statusCode || resendError?.status;
          const msg = String(resendError?.message || '');

          // Si Resend está en testing (403), permitir fallback a SMTP sin dominio.
          const isResendTesting403 =
            statusCode === 403 &&
            (/modo testing/i.test(msg) || /only send testing emails to your own email address/i.test(msg));

          if (isResendTesting403 && process.env.SMTP_USER && process.env.SMTP_PASS) {
            logger.warn('⚠️ Resend en modo testing (403); usando fallback a SMTP.');
            await this.sendEmailViaSmtp(options);
            return;
          }

          throw resendError;
        }
      }

      if (this.isSendgridEnabled()) {
        await this.sendEmailViaSendgrid(options);
        return;
      }

      await this.sendEmailViaSmtp(options);
    } catch (error: any) {
      logger.error('❌ Error enviando email:', error);
      const baseMsg = 'No se pudo enviar el email';
      const msg = String(error?.message || '');
      const statusCode = error?.statusCode || error?.status;

      // Nodemailer suele exponer estos campos en errores de auth.
      const smtpCode = String(error?.code || '');
      const smtpResponseCode = Number(error?.responseCode);

      // Errores típicos de red/conexión al SMTP (p.ej. proveedor bloqueado por el host).
      const isSmtpNetworkError =
        smtpCode === 'ETIMEDOUT' ||
        smtpCode === 'ESOCKET' ||
        smtpCode === 'ECONNRESET' ||
        smtpCode === 'ECONNREFUSED' ||
        smtpCode === 'EHOSTUNREACH' ||
        smtpCode === 'ENETUNREACH' ||
        smtpCode === 'ENOTFOUND';

      const isSmtpConfigError =
        msg.includes('SMTP_USER/SMTP_PASS no están configurados') ||
        /invalid login/i.test(msg) ||
        smtpCode === 'EAUTH' ||
        smtpResponseCode === 535;

      // Mensajes "seguros" para mostrar en producción cuando es un problema de configuración.
      const isSafeConfigError =
        msg.startsWith('Resend:') ||
        msg === 'RESEND_API_KEY no está configurado' ||
        msg.startsWith('EMAIL_FROM no está configurado') ||
        msg.startsWith('SendGrid:') ||
        msg === 'SENDGRID_API_KEY no está configurado' ||
        msg.startsWith('EMAIL_FROM no está configurado (requerido para SendGrid)') ||
        isSmtpConfigError ||
        isSmtpNetworkError;

      if (process.env.NODE_ENV === 'development' || isSafeConfigError) {
        const wrapped: any = new Error(`${baseMsg}: ${error?.message || 'error desconocido'}`);

        // Mapear credenciales SMTP inválidas a 401 (más claro para frontend).
        if (isSmtpConfigError && !statusCode) {
          wrapped.statusCode = 401;
        } else if (isSmtpNetworkError && !statusCode) {
          // Timeout/bloqueo de red hacia SMTP: servicio no disponible.
          wrapped.statusCode = smtpCode === 'ETIMEDOUT' ? 504 : 503;
        } else if (statusCode) {
          wrapped.statusCode = statusCode;
        }
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
