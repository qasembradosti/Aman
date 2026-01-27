import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import productRoutes from './routes/ProductRoutes.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import adminWalletRoutes from './routes/adminWalletRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pushTokenRoutes from './routes/pushTokenRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import adminBrandRoutes from './routes/adminBrandRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import withdrawalRoutes from './routes/withdrawalRoutes.js';
import db from './config/knex.js';
import { runStartupSchemaSetup } from './services/schemaSetup.js';
import setupSocketIO from './utils/socketIO.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure required tables/columns BEFORE handling any requests (prevents early 500s)
try {
    await runStartupSchemaSetup();
    console.log('✅ Pre-start schema setup completed');
} catch (e) {
    console.warn('⚠️ Pre-start schema setup failed:', e.message);
}

// CORS first
app.use(cors());

// Serve static files for uploads - BEFORE body parsers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files with proper headers for video streaming
const staticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm') || filePath.endsWith('.mov')) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
    }
  }
};

app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos'), staticOptions));
app.use('/documents', express.static(path.join(__dirname, 'public', 'documents')));
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Mount upload routes BEFORE body parsers (multipart/form-data must not be parsed by express.json)
app.use('/api', uploadRoutes);

// Body parsers for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount other routes
const routes = [
    productRoutes,
    categoryRoutes,
    walletRoutes,
    adminWalletRoutes,
    notificationRoutes,
    userRoutes,
    authRoutes,
    brandRoutes,
    adminBrandRoutes,
    pushTokenRoutes,
    bannerRoutes,
    orderRoutes,
    reviewRoutes,
    dashboardRoutes,
    storeRoutes,
    withdrawalRoutes
];

routes.forEach((route) => {
    app.use('/api', route);
});

// Serve static files from /public (images, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Start server with Socket.io
const httpServer = http.createServer(app);
const io = setupSocketIO(httpServer);

// Store io instance globally for use in controllers/services
global.io = io;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
    db.raw('SELECT 1')
        .then(() => console.log('✅ Database connected successfully'))
        .catch((err) => console.error('❌ Database connection failed:', err.message));
});
