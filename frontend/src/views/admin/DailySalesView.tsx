import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Divider, Table,
  TableHead, TableRow, TableCell, TableBody, Paper, CircularProgress,
  IconButton
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as HorizontalBarChart
} from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

interface DashboardData {
  totalSales: number;
  totalTips: number;
  totalOrders: number;
  salesByHour: { hour: string; ventas: number }[];
  topProducts: { nombre: string; pedidos: number; total: number }[];
  waiterSummary: { name: string; documentId: string | null; sales: number; tips: number; orders: number }[];
}

export const DailySalesView: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/daily-dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh cada 60 segundos
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress size={60} /></Box>;
  }

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">📊 Dashboard de Ventas</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{today}</Typography>
        </Box>
        <IconButton onClick={fetchData} disabled={loading} color="primary" title="Actualizar">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Métricas rápidas */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#e8f5e9', borderRadius: 3, boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 48, color: 'success.dark' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Ventas Totales Hoy</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.dark">
                  ${(data?.totalSales || 0).toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#fff3e0', borderRadius: 3, boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MonetizationOnIcon sx={{ fontSize: 48, color: 'warning.dark' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Propinas Recaudadas</Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.dark">
                  ${(data?.totalTips || 0).toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#e3f2fd', borderRadius: 3, boxShadow: 2 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ReceiptLongIcon sx={{ fontSize: 48, color: 'primary.dark' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">Comandas Cerradas</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.dark">
                  {data?.totalOrders || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Gráfica de ventas por hora */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              🕐 Ventas por Hora del Día
            </Typography>
            {(data?.salesByHour || []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography>Sin ventas registradas hoy aún</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.salesByHour || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, 'Ventas']} />
                  <Bar dataKey="ventas" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Top 5 platos más pedidos */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              🍽️ Top 5 Platos Más Pedidos
            </Typography>
            {(data?.topProducts || []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography>Sin datos aún</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <HorizontalBarChart
                  layout="vertical"
                  data={data?.topProducts || []}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: any) => [`${value || 0} pedidos`, 'Cantidad']} />
                  <Bar dataKey="pedidos" fill="#2e7d32" radius={[0, 4, 4, 0]} />
                </HorizontalBarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Tabla de resumen por mesero */}
        <Grid item xs={12}>
          <Paper sx={{ borderRadius: 3, boxShadow: 2 }}>
            <Box sx={{ p: 2.5, pb: 0 }}>
              <Typography variant="h6" fontWeight="bold">👤 Rendimiento por Mesero (Hoy)</Typography>
            </Box>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell><strong>Mesero</strong></TableCell>
                  <TableCell><strong>Cédula</strong></TableCell>
                  <TableCell align="center"><strong>Comandas</strong></TableCell>
                  <TableCell align="right"><strong>Ventas</strong></TableCell>
                  <TableCell align="right"><strong>Propinas</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.waiterSummary || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Sin actividad registrada hoy
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.waiterSummary || []).map((w, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{w.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{w.documentId || 'S/N'}</TableCell>
                      <TableCell align="center">{w.orders}</TableCell>
                      <TableCell align="right">${w.sales.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        ${w.tips.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
