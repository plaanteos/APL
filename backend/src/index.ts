import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import auditRoutes from './routes/audit.routes';
import productoRoutes from './routes/producto.routes';
import estadoRoutes from './routes/estado.routes';
import notificationRoutes from './routes/notification.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/logger';

// Import utils
import logger from './utils/logger';
import { validateEnv } from './utils/validateEnv';
import { closeNotificationQueue, initNotificationWorker } from './queues/notification.queue';

// Load environment variables
dotenv.config();

// Validar variables de entorno antes de iniciar
validateEnv();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Render (y la mayoría de PaaS) se ejecuta detrás de un proxy/ingress.
// Esto permite a Express leer correctamente la IP real desde X-Forwarded-For,
// y evita el ValidationError de express-rate-limit.
app.set('trust proxy', 1);

// CORS configuration - DEBE IR ANTES QUE TODO
const allowedOrigins = [
  'https://administracionapl.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CORS_ORIGIN
].filter(Boolean);

console.log('🔧 Origins permitidos:', allowedOrigins);

// Middleware manual de CORS para asegurar que los headers siempre se envíen
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  console.log(`📨 ${req.method} ${req.path} - Origin: ${origin || 'sin origin'}`);
  
  // Si el origin está en la lista permitida, agregarlo al header
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    console.log(`✅ CORS headers agregados para: ${origin || '*'}`);
  } else {
    console.warn(`❌ Origin NO permitido: ${origin}`);
    console.warn(`   Origins válidos:`, allowedOrigins);
  }
  
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    console.log(`✅ Preflight OPTIONS respondido con 204`);
    return res.status(204).end();
  }
  
  next();
});

// CORS middleware adicional con cors package
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security middleware - CON CONFIGURACIÓN AJUSTADA PARA CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false
}));

// Middleware para manejar explícitamente OPTIONS (preflight)
app.options('*', (req, res) => {
  console.log(`✅ Preflight request para: ${req.path} desde ${req.headers.origin}`);
  res.status(204).end();
});

// Logging middleware
app.use(requestLogger);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // En producción, loguear las peticiones para debug de CORS
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'sin origin'}`);
    next();
  });
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'APL Dental Lab API is running',
    timestamp: new Date().toISOString()
  });
});

// Handle favicon.ico request to avoid 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Rate limiting para protección contra ataques de fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana
  message: {
    success: false,
    error: 'Demasiados intentos de login. Por favor intenta en 15 minutos.'
  },
  standardHeaders: true, // Retorna info en headers `RateLimit-*`
  legacyHeaders: false, // Desactiva headers `X-RateLimit-*`
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit excedido desde IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Demasiados intentos de login. Por favor intenta en 15 minutos.'
    });
  }
});

// API routes
app.use('/api/auth/login', loginLimiter); // Aplicar rate limit solo a login
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/estados', estadoRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection check
async function connectDatabase() {
  const skipDbConnect = (process.env.SKIP_DB_CONNECT || '').toLowerCase() === 'true';
  if (skipDbConnect) {
    logger.warn('⚠️ SKIP_DB_CONNECT=true: iniciando API sin conexión a la base de datos (solo para pruebas locales).');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      const safeUser = decodeURIComponent(parsed.username || '');
      const host = parsed.hostname;
      const port = parsed.port || '5432';
      const dbName = (parsed.pathname || '').replace(/^\//, '') || '(sin db)';
      logger.info(`🗄️  DB target: ${safeUser ? safeUser + '@' : ''}${host}:${port}/${dbName}`);
    } catch {
      logger.warn('⚠️ DATABASE_URL no es un URL válido (no se pudo parsear).');
    }
  }

  const maxAttempts = Number(process.env.DB_CONNECT_MAX_ATTEMPTS || 12); // ~5-10 min según backoff
  const baseDelayMs = Number(process.env.DB_CONNECT_BASE_DELAY_MS || 1000);
  const maxDelayMs = Number(process.env.DB_CONNECT_MAX_DELAY_MS || 30000);

  let attempt = 0;
  // Reintenta para tolerar latencias/cortes momentáneos del proveedor externo.
  while (true) {
    attempt += 1;
    try {
      await prisma.$connect();
      logger.info('✅ Connected to PostgreSQL database');
      return;
    } catch (error) {
      logger.error(`❌ Failed to connect to database (attempt ${attempt}/${maxAttempts}):`, error);
      logger.error('💡 Si estás en producción, verificá que DATABASE_URL apunte a una Postgres externa activa (con SSL si aplica).');
      logger.error('💡 Para local: DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/apl_dental_lab?schema=public"');
      logger.error('   (o usar SKIP_DB_CONNECT=true para iniciar sin DB)');

      if (attempt >= maxAttempts) {
        logger.error('🛑 Se agotaron los reintentos de conexión a la DB. Cerrando proceso para que Render lo reinicie.');
        process.exit(1);
      }

      const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      const waitMs = exp + jitter;
      logger.warn(`⏳ Reintentando conexión a la DB en ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

// Start server
async function startServer() {
  await connectDatabase();

  // Cola de trabajos (Redis/BullMQ) para envíos asíncronos si está configurada
  initNotificationWorker();
  
  app.listen(PORT, () => {
    logger.info(`🚀 APL Backend API server running on port ${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeNotificationQueue();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeNotificationQueue();
  await prisma.$disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(error.name, error.message);
  logger.error(error.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('❌ UNHANDLED REJECTION! Shutting down...');
  logger.error(reason);
  process.exit(1);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});