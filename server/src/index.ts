import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import clientRoutes from './routes/clients';
import contactRoutes from './routes/contacts';
import settingsRoutes from './routes/settings';
import reportRoutes from './routes/reports';
import reconciliationRoutes from './routes/reconciliation';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Root route
// ---------------------------------------------------------------------------
const startTimestamp = new Date();

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to the SAFE-CRM API',
    version: '1.0.0',
    documentation: 'https://github.com/user/safe-crm'
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', async (_req: Request, res: Response) => {
  const uptime = (new Date().getTime() - startTimestamp.getTime()) / 1000;

  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'unreachable';
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database: dbStatus,
      express: 'up'
    }
  });
});

// ---------------------------------------------------------------------------
// Route modules
// ---------------------------------------------------------------------------
app.use('/api/clients', clientRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reconciliation', reconciliationRoutes);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🚀 SAFE-CRM Backend listening at http://localhost:${port}`);
    console.log(`🩺 Health check endpoint: http://localhost:${port}/health`);
  });
}

export default app;
