import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './modules/auth/auth.routes';
import tableRoutes from './modules/tables/table.routes';
import menuRoutes from './modules/menu/menu.routes';
import orderRoutes from './modules/orders/order.routes';
import reportRoutes from './modules/reports/report.routes';
import shiftRoutes from './modules/shifts/shift.routes';
import userRoutes from './modules/users/user.routes';
import reservationRoutes from './modules/reservations/reservation.routes';
import cashRoutes from './modules/cash/cash.routes';
import wasteRoutes from './modules/waste/waste.routes';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// Endpoint de verificación de salud
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/waste', wasteRoutes);

export default app;
