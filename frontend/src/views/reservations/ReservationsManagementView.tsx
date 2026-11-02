import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, TextField, IconButton, CircularProgress,
  Alert, Tooltip
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CancelIcon from '@mui/icons-material/Cancel';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { CreateReservationDialog } from './CreateReservationDialog';

interface ReservationItem {
  id: string;
  customerName: string;
  customerPhone: string | null;
  guestsCount: number;
  reservationDate: string;
  notes: string | null;
  status: 'CONFIRMED' | 'SEATED' | 'CANCELLED';
  table: {
    id: string;
    number: number;
    capacity: number;
  };
}

const statusConfig: Record<string, { label: string; color: 'info' | 'success' | 'default' }> = {
  CONFIRMED: { label: 'Confirmada', color: 'info' },
  SEATED: { label: 'Sentada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'default' },
};

export const ReservationsManagementView: React.FC = () => {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const url = dateFilter ? `/api/reservations?date=${dateFilter}` : '/api/reservations';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setReservations(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleSeat = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}/seat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setActionMsg('¡Clientes sentados y mesa marcada en consumo!');
        fetchReservations();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setActionMsg('Reserva cancelada y mesa liberada.');
        fetchReservations();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            📅 Libro y Agenda de Reservas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra las reservas programadas por fecha, asignación de mesas y control de llegada de clientes.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: 170 }}
          />
          <IconButton onClick={fetchReservations} disabled={loading} color="primary" title="Refrescar">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 'bold' }}
          >
            Nueva Reserva
          </Button>
        </Box>
      </Box>

      {actionMsg && (
        <Alert severity="success" sx={{ mb: 2, fontWeight: 'bold' }}>
          {actionMsg}
        </Alert>
      )}

      {loading && reservations.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress size={50} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Hora</strong></TableCell>
                <TableCell><strong>Cliente / Titular</strong></TableCell>
                <TableCell><strong>Teléfono</strong></TableCell>
                <TableCell align="center"><strong>Mesa</strong></TableCell>
                <TableCell align="center"><strong>Comensales</strong></TableCell>
                <TableCell><strong>Notas</strong></TableCell>
                <TableCell align="center"><strong>Estado</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No hay reservas registradas para la fecha seleccionada.
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((r) => {
                  const timeStr = new Date(r.reservationDate).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const badge = statusConfig[r.status] || { label: r.status, color: 'default' };

                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        {timeStr}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{r.customerName}</TableCell>
                      <TableCell>{r.customerPhone || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip label={`Mesa ${r.table.number}`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{r.guestsCount} pers.</TableCell>
                      <TableCell sx={{ maxWidth: 200, color: 'text.secondary' }}>
                        {r.notes || '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={badge.label}
                          color={badge.color}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {r.status === 'CONFIRMED' ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="Sentar clientes (abrir mesa)">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleSeat(r.id)}
                              >
                                <RestaurantMenuIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancelar reserva">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCancel(r.id)}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {createDialogOpen && (
        <CreateReservationDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSuccess={() => fetchReservations()}
        />
      )}
    </Box>
  );
};
