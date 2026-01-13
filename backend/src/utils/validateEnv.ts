import logger from './logger';

/**
 * Validación de variables de entorno requeridas
 * Se ejecuta al iniciar el servidor para asegurar que la configuración es correcta
 */

interface EnvConfig {
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
}

const requiredEnvVars: Array<keyof EnvConfig> = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];

export const validateEnv = (): void => {
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Verificar variables requeridas
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

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

  // Mostrar warnings
  if (warnings.length > 0) {
    warnings.forEach(warning => logger.warn(`⚠️  ${warning}`));
  }

  // Si faltan variables críticas, detener el servidor
  if (missingVars.length > 0) {
    logger.error('❌ Faltan las siguientes variables de entorno requeridas:');
    missingVars.forEach(varName => logger.error(`   - ${varName}`));
    logger.error('\n💡 Asegúrate de tener un archivo .env con todas las variables requeridas');
    process.exit(1);
  }

  logger.info('✅ Variables de entorno validadas correctamente');
};
