import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './config/initDb.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

import path from 'path';

// Middleware
app.disable('x-powered-by');

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads folder
const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/admin', adminDashboardRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Ghazi Enterprise API is running...');
});

// Start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Admin dashboard available at http://localhost:${PORT}/admin`);
    });
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  });
