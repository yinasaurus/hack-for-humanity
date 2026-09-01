import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { assertJwtSecretConfigured } from './auth.js';
import { registerRoutes } from './routes.js';

dotenv.config();
assertJwtSecretConfigured();

const app = express();
const PORT = process.env.PORT || 3001;

// Explicit CORS: allow Authorization header from any origin (dashboard + mobile)
app.use(cors({
  origin: true,           // echo back the request Origin
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type'],
  credentials: false,     // we use Bearer tokens, not cookies
}));
app.use(express.json({ limit: '20mb' }));
// Keep urlencoded small; photos go multipart or JSON base64
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

registerRoutes(app);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Companion clinic API listening on http://0.0.0.0:${PORT}`);
});
