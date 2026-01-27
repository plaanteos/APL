import nodemailer from 'nodemailer';
import logger from '../utils/logger';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = port === 465;

    // Configurar transporte de email (Gmail recomendado vía App Password)
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP_USER/SMTP_PASS no están configurados');
      }

            await this.transporter.sendMail({
                from: `"APL Laboratorio Dental" <${process.env.SMTP_USER}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
            });
      logger.info(`📧 Email enviado a ${options.to}`);
        } catch (error) {
      logger.error('❌ Error enviando email:', error);
      throw new Error('No se pudo enviar el email');
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
}

export const emailService = new EmailService();
