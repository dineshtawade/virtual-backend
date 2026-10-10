import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import brokerRoutes from './routes/brokerRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import emulatorRoutes from './routes/emulatorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/broker', brokerRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/emulator', emulatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/properties', propertyRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Broker Subscription Simulator API is running smoothly.' });
});

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Broker Simulator Backend running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${port} in use]: Attempting next port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

const INITIAL_PORT = parseInt(process.env.PORT || '5000', 10);

connectDB().then(() => {
  startServer(INITIAL_PORT);
});
