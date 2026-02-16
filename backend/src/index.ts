import * as express from 'express';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { initBot } from './bot';

// Load environment variables from .env file
dotenv.config();

// Initialise Firebase Admin SDK using service account credentials
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Private key is stored with newline characters escaped; replace \n with real newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

export const db = firebaseApp.firestore();

// Express server setup
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Add additional API endpoints for dashboard queries, service management, etc.

// Start Telegram/WhatsApp bot
initBot(db).catch((err) => {
  console.error('Failed to initialise bot:', err);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
