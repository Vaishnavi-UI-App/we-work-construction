import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import vendorsRouter from './routes/vendors';
import sitesRouter from './routes/sites';
import chatbotRouter from './routes/chatbot';
import reportsRouter from './routes/reports';
import walletRouter from './routes/wallet';
import usersRouter from './routes/users';
import attendanceRouter from './routes/attendance';
import organisationRouter from './routes/organisation';
import billingRouter from './routes/billing';
import deliveryChallanRouter from './routes/deliveryChallan';
import rolesRouter from './routes/roles';
import geocodeRouter from './routes/geocode';
import bankingRouter from './routes/banking';

dotenv.config();
const app = express();
const server = http.createServer(app);

export const io = new SocketServer(server, { cors: { origin: '*' } });

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Serve uploaded receipts as static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter(prisma));
app.use('/api/customers', customersRouter(prisma));
app.use('/api/vendors', vendorsRouter(prisma));
app.use('/api/sites', sitesRouter(prisma));
app.use('/api/chatbot', chatbotRouter());
app.use('/api/reports', reportsRouter(prisma));
app.use('/api/wallet', walletRouter(prisma));
app.use('/api/users', usersRouter(prisma));
app.use('/api/attendance', attendanceRouter(prisma));
app.use('/api/organisation', organisationRouter(prisma));
app.use('/api/billing', billingRouter(prisma));
app.use('/api/delivery-challans', deliveryChallanRouter(prisma));
app.use('/api/roles', rolesRouter(prisma));
app.use('/api/geocode', geocodeRouter());
app.use('/api/banking', bankingRouter(prisma));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

const port = process.env.PORT || 4001;
server.listen(port, () => {
  console.log(`We Work backend listening on ${port}`);
});
