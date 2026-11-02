import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, TextField, CircularProgress, IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ShiftRecord {
  id: string;
  openedAt: string;
  closedAt: string | null;
  totalSales: number;
  totalTips: number;
  ordersCount: number;
  user: { name: string; documentId: string | null };
}

export const ShiftHistoryView: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/history?date=${dateFilter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setShifts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = (opened: string, closed: string | null) => {
    const start = new Date(opened).getTime();
    const end = closed ? new Date(closed).getTime() : Date.now();
    const mins = Math.floor((end - start) / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remMins}m` : `${remMins}m`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">⏱️ Historial de Turnos</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 180 }}
          />
          <IconButton onClick={fetchShifts} disabled={loading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {loading && shifts.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress size={50} />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 3, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Mesero</strong></TableCell>
                <TableCell><strong>Cédula</strong></TableCell>
                <TableCell align="center"><strong>Entrada</strong></TableCell>
                <TableCell align="center"><strong>Salida</strong></TableCell>
                <TableCell align="center"><strong>Duración</strong></TableCell>
                <TableCell align="center"><strong>Comandas</strong></TableCell>
                <TableCell align="right"><strong>Ventas</strong></TableCell>
                <TableCell align="right"><strong>Propinas</strong></TableCell>
                <TableCell align="center"><strong>Estado</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    Sin turnos registrados para esta fecha
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{s.user.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.user.documentId || 'S/N'}</TableCell>
                    <TableCell align="center">{formatTime(s.openedAt)}</TableCell>
                    <TableCell align="center">{s.closedAt ? formatTime(s.closedAt) : '—'}</TableCell>
                    <TableCell align="center">{getDuration(s.openedAt, s.closedAt)}</TableCell>
                    <TableCell align="center">{s.ordersCount}</TableCell>
                    <TableCell align="right">${Number(s.totalSales).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                      ${Number(s.totalTips).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      {s.closedAt ? (
                        <Chip label="Cerrado" size="small" color="default" />
                      ) : (
                        <Chip label="ABIERTO" size="small" color="success" sx={{ fontWeight: 'bold' }} />
                      )}
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
