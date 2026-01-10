import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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

// Import services
import { ReminderService } from './services/reminder.service';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'https://administracionapl.netlify.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS permitido para: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`Bloqueado por CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
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

// API routes
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
    console.log('✅ Connected to MySQL database');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

// Initialize reminder system
async function initializeReminderSystem() {
  try {
    await ReminderService.initialize();
    console.log('✅ Sistema de recordatorios inicializado');
  } catch (error) {
    console.error('❌ Error inicializando sistema de recordatorios:', error);
  }
}

// Start server
async function startServer() {
  await connectDatabase();
  await initializeReminderSystem();
  
  app.listen(PORT, () => {
    console.log(`🚀 APL Backend API server running on port ${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  ReminderService.stopAllJobs();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  ReminderService.stopAllJobs();
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});