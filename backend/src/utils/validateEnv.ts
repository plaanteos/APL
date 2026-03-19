import logger from './logger';

/**
 * Validación de variables de entorno requeridas
 * Se ejecuta al iniciar el servidor para asegurar que la configuración es correcta
 */

interface EnvConfig {
  PORT: string;
  JWT_SECRET: string;
  NODE_ENV: string;
}

const requiredEnvVars: Array<keyof EnvConfig> = [
  'PORT',
  'JWT_SECRET',
  'NODE_ENV'
];

export const validateEnv = (): void => {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];
  const warnings: string[] = [];

  const skipDbConnect = (process.env.SKIP_DB_CONNECT || '').toLowerCase() === 'true';

  // Verificar variables requeridas
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // DATABASE_URL solo es requerida si se va a conectar a DB
  if (!skipDbConnect && !process.env.DATABASE_URL) {
    missingVars.push('DATABASE_URL');
  }

  // Log seguro para diagnosticar "se borra la DB" (sin filtrar credenciales)
  if (!skipDbConnect && process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const dbName = (url.pathname || '').replace(/^\//, '') || 'n/a';
      const schema = url.searchParams.get('schema') || 'public';
      const sslmode = url.searchParams.get('sslmode') || 'n/a';
      logger.info(`🗄️ DB target: host=${url.host} db=${dbName} schema=${schema} sslmode=${sslmode}`);

      const hostLower = (url.hostname || '').toLowerCase();
      if (process.env.NODE_ENV === 'production' && (hostLower === 'localhost' || hostLower === '127.0.0.1')) {
        warnings.push('DATABASE_URL en producción apunta a localhost/127.0.0.1. En Render eso implica DB inexistente o distinta y puede dar síntomas de "base vacía".');
      }
    } catch {
      invalidVars.push('DATABASE_URL');
    }
  }

  if (skipDbConnect) {
    warnings.push('SKIP_DB_CONNECT=true: la API iniciará sin conexión a la base de datos (solo para pruebas locales).');
  }

  // Verificar valores específicos
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    warnings.push(`NODE_ENV tiene un valor no estándar: "${process.env.NODE_ENV}". Valores recomendados: development, production, test`);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET es muy corto. Se recomienda al menos 32 caracteres para mayor seguridad.');
  }

  if (process.env.PORT && isNaN(Number(process.env.PORT))) {
    warnings.push(`PORT debe ser un número, recibido: "${process.env.PORT}"`);
  }

  // Configuración de Email (Gmail/SMTP) - warning si falta
  const isResend = !!process.env.RESEND_API_KEY;
  const isSendgrid = !!process.env.SENDGRID_API_KEY;

  // Validación básica de EMAIL_FROM (aplica a SMTP y a APIs)
  if (process.env.EMAIL_FROM) {
    const from = String(process.env.EMAIL_FROM);
    const gtIndex = from.indexOf('>');
    if (gtIndex !== -1 && from.slice(gtIndex + 1).trim().length > 0) {
      warnings.push('EMAIL_FROM parece mal formado: hay texto extra luego de ">". Ejemplo válido: "APL <gestion.apl.dental@gmail.com>"');
    }
  }

  if (isResend) {
    if (!process.env.EMAIL_FROM) {
      warnings.push('RESEND_API_KEY está definido pero falta EMAIL_FROM (ej: "APL <no-reply@tu-dominio>").');
    }
  } else if (isSendgrid) {
    if (!process.env.EMAIL_FROM) {
      warnings.push('SENDGRID_API_KEY está definido pero falta EMAIL_FROM (ej: "APL <no-reply@tu-dominio>").');
    }
  } else {
    if (process.env.SMTP_USER && !process.env.SMTP_PASS) {
      warnings.push('SMTP_USER está definido pero falta SMTP_PASS. Para Gmail usa App Password.');
    }
    if (!process.env.SMTP_USER && process.env.SMTP_PASS) {
      warnings.push('SMTP_PASS está definido pero falta SMTP_USER.');
    }

    const smtpHost = (process.env.SMTP_HOST || '').toLowerCase();
    if (smtpHost.includes('sendgrid')) {
      if (process.env.SMTP_USER && process.env.SMTP_USER !== 'apikey') {
        warnings.push('Para SendGrid SMTP, SMTP_USER debe ser "apikey" (literal).');
      }
      if (!process.env.EMAIL_FROM) {
        warnings.push('Para SendGrid SMTP se recomienda definir EMAIL_FROM con un sender verificado (ej: "APL <no-reply@tu-dominio>").');
      }
    }
  }

  // Si no hay ningún proveedor configurado, avisar (no es fatal, pero explica 500 al intentar enviar).
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!isResend && !isSendgrid && !hasSmtp) {
    warnings.push('Email no configurado: definí RESEND_API_KEY o SENDGRID_API_KEY (recomendado en Render) o SMTP_USER/SMTP_PASS para habilitar envíos.');
  }

  // Ayuda: prioridad de proveedores
  if (isResend && isSendgrid) {
    warnings.push('RESEND_API_KEY y SENDGRID_API_KEY están definidos. Prioridad: Resend (API) primero, luego SendGrid (API).');
  }
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL no está definido. Solo es requerido si enviás links de recuperación (en vez de código).');
  }

  // Configuración de WhatsApp Cloud API - warning si está incompleta
  const waToken = process.env.WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if ((waToken && !waPhoneId) || (!waToken && waPhoneId)) {
    warnings.push('WhatsApp está parcialmente configurado. Se requieren WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID.');
  }

  // Configuración de Job Queue (BullMQ + Redis) - opcional
  if (process.env.NOTIFICATION_QUEUE_ENABLED === 'true' && !process.env.REDIS_URL) {
    warnings.push('NOTIFICATION_QUEUE_ENABLED=true pero falta REDIS_URL. Se usará envío directo (sin cola).');
  }

  // Mostrar warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(`⚠️  ${warning}`));
  }

  // Si faltan variables críticas, detener el servidor
  if (missingVars.length > 0 || invalidVars.length > 0) {
    logger.error('❌ Faltan las siguientes variables de entorno requeridas:');
    missingVars.forEach(varName => logger.error(`   - ${varName}`));
    if (invalidVars.length > 0) {
      logger.error('❌ Las siguientes variables tienen un formato inválido:');
      invalidVars.forEach(varName => logger.error(`   - ${varName}`));
      logger.error('💡 Si tu password/usuario tiene caracteres especiales (:@/?#[]@), debés URL-encodarlos.');
      logger.error('   Ej: postgresql://USER:P%40SS%3AWORD@HOST:5432/DB?sslmode=require');
    }
    logger.error('\n💡 Asegúrate de tener un archivo .env con todas las variables requeridas');
    process.exit(1);
  }

  logger.info('✅ Variables de entorno validadas correctamente');
};
