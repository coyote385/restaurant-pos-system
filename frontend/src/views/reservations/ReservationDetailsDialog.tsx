import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Alert, Divider, Chip
} from '@mui/material';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CancelIcon from '@mui/icons-material/Cancel';
import { Table, useTableStore } from '../../stores/useTableStore';

interface Props {
  open: boolean;
  onClose: () => void;
  table: Table;
  onSeated: (table: Table) => void;
}

export const ReservationDetailsDialog: React.FC<Props> = ({
  open,
  onClose,
  table,
  onSeated,
}) => {
  const { fetchTables } = useTableStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRes = table.reservations?.[0];

  const handleSeat = async () => {
    if (!activeRes) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${activeRes.id}/seat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al sentar a los clientes.');
        return;
      }
      await fetchTables();
      onClose();
      onSeated({ ...table, status: 'OCCUPIED' });
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRes) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${activeRes.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cancelar la reserva.');
        return;
      }
      await fetchTables();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const formattedTime = activeRes
    ? new Date(activeRes.reservationDate).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <EventSeatIcon color="info" /> Mesa {table.number} — Reservada
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeRes ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body1">
                Titular: <strong>{activeRes.customerName}</strong>
              </Typography>
            </Box>

            {activeRes.customerPhone && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PhoneIcon sx={{ color: 'text.secondary', mr: 1 }} />
                <Typography variant="body2">
                  Teléfono: <strong>{activeRes.customerPhone}</strong>
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <AccessTimeIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body2">
                Programada para: <strong>{formattedTime}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                label={`${activeRes.guestsCount} personas`}
                color="info"
                size="small"
                sx={{ fontWeight: 'bold', mr: 1 }}
              />
              <Chip label="CONFIRMADA" color="primary" size="small" sx={{ fontWeight: 'bold' }} />
            </Box>

            {activeRes.notes && (
              <Box sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2, mb: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Notas de la reserva:
                </Typography>
                <Typography variant="body2">{activeRes.notes}</Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Typography color="text.secondary">
            Esta mesa se encuentra marcada como reservada.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          color="success"
          size="large"
          startIcon={<RestaurantMenuIcon />}
          onClick={handleSeat}
          disabled={loading || !activeRes}
          sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 3 }}
        >
          {loading ? 'Procesando...' : 'Sentar Clientes y Tomar Pedido'}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
          onClick={handleCancel}
          disabled={loading || !activeRes}
        >
          Cancelar Reserva (Liberar Mesa)
        </Button>
      </DialogActions>
    </Dialog>
  );
};
