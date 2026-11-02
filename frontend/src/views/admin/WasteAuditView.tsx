import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, TextField, CircularProgress, IconButton, Button,
  Grid, Card, CardContent, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import FastfoodIcon from '@mui/icons-material/Fastfood';

export const WasteAuditView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalLoss: 0,
    totalItems: 0,
    totalEvents: 0,
    topReason: 'Sin registros',
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = dateFilter ? `/api/waste/logs?date=${dateFilter}` : '/api/waste/logs';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setSummary(data.summary || {});
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteSweepIcon color="error" /> Auditoría de Mermas y Cancelaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Trazabilidad de platillos anulados con justificación y cálculo de pérdidas financieras.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            label="Filtrar por Fecha"
            InputLabelProps={{ shrink: true }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 170 }}
          />
          {dateFilter && (
            <Button size="small" onClick={() => setDateFilter('')}>
              Ver Todos
            </Button>
          )}
          <Tooltip title="Actualizar auditoría">
            <IconButton onClick={fetchLogs} disabled={loading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, borderLeft: '5px solid #d32f2f' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Dinero Perdido en Mermas</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                ${Number(summary.totalLoss || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, borderLeft: '5px solid #ed6c02' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Platillos Desperdiciados</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.dark">
                {summary.totalItems || 0} unidades
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, boxShadow: 1, borderLeft: '5px solid #0288d1' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Motivo Más Frecuente</Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="info.dark" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summary.topReason || 'Ninguno'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de Registros */}
      {loading && logs.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Fecha / Hora</strong></TableCell>
                <TableCell><strong>Platillo Anulado</strong></TableCell>
                <TableCell align="center"><strong>Cantidad</strong></TableCell>
                <TableCell align="right"><strong>Pérdida ($)</strong></TableCell>
                <TableCell><strong>Motivo Justificado</strong></TableCell>
                <TableCell><strong>Responsable</strong></TableCell>
                <TableCell><strong>Observaciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No se han registrado mermas ni cancelaciones justificadas.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontSize: '12px' }}>
                      {new Date(log.createdAt).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {log.productName}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={`${log.quantity} ud`} size="small" />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      ${Number(log.cost).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.reason}
                        size="small"
                        color={
                          log.reason.includes('quemado') || log.reason.includes('defectuoso')
                            ? 'error'
                            : log.reason.includes('demora')
                            ? 'warning'
                            : 'default'
                        }
                        sx={{ fontWeight: 'bold', fontSize: '11px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {log.user?.name || 'Usuario'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.user?.role === 'WAITER' ? 'Mesero' : log.user?.role === 'ADMIN' ? 'Admin' : 'Cocina'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '12px', color: 'text.secondary', maxWidth: 200 }}>
                      {log.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};
