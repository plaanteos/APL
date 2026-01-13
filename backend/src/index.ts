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
import reminderRoutes from './routes/reminder.routes';
import searchRoutes from './routes/search.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/logger';

// Import services
import { ReminderService } from './services/reminder.service';
import logger from './utils/logger';
import { validateEnv } from './utils/validateEnv';

// Load environment variables
dotenv.config();

// Validar variables de entorno antes de iniciar
validateEnv();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

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
app.use('/api/reminders', reminderRoutes);
app.use('/api/search', searchRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection check
async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Connected to MySQL database');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

// Initialize reminder system
async function initializeReminderSystem() {
  try {
    await ReminderService.initialize();
    logger.info('✅ Sistema de recordatorios inicializado');
  } catch (error) {
    logger.error('❌ Error inicializando sistema de recordatorios:', error);
  }
}

// Start server
async function startServer() {
  await connectDatabase();
  await initializeReminderSystem();
  
  app.listen(PORT, () => {
    logger.info(`🚀 APL Backend API server running on port ${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  ReminderService.stopAllJobs();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  ReminderService.stopAllJobs();
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