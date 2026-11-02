import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem, Alert, Box,
  Typography
} from '@mui/material';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import { useTableStore } from '../../stores/useTableStore';

interface Props {
  open: boolean;
  onClose: () => void;
  initialTableId?: string;
  onSuccess?: () => void;
}

export const CreateReservationDialog: React.FC<Props> = ({
  open,
  onClose,
  initialTableId,
  onSuccess,
}) => {
  const { tables, fetchTables } = useTableStore();
  const [tableId, setTableId] = useState(initialTableId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [reservationDate, setReservationDate] = useState(() => {
    // Default: fecha actual + 1 hora en formato YYYY-MM-DDTHH:mm
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTableId) {
      setTableId(initialTableId);
    }
  }, [initialTableId]);

  const candidateTables = tables.filter((t) => t.status !== 'MERGED');

  const handleSave = async () => {
    setError(null);
    if (!customerName.trim()) {
      setError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!tableId) {
      setError('Debes seleccionar una mesa.');
      return;
    }
    if (!reservationDate) {
      setError('Debes indicar fecha y hora de la reserva.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          tableId,
          customerName,
          customerPhone,
          guestsCount,
          reservationDate: new Date(reservationDate).toISOString(),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al crear la reserva.');
        return;
      }

      await fetchTables();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <EventSeatIcon color="primary" /> Nueva Reserva de Mesa
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth margin="dense">
          <InputLabel id="table-select-label">Mesa</InputLabel>
          <Select
            labelId="table-select-label"
            value={tableId}
            label="Mesa"
            onChange={(e) => setTableId(e.target.value)}
          >
            {candidateTables.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                Mesa {t.number} ({t.capacity} personas) — {t.status === 'AVAILABLE' ? 'Disponible' : t.status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Nombre del Cliente / Titular"
          placeholder="Ej: Familia Morales"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        <TextField
          fullWidth
          margin="dense"
          label="Teléfono de Contacto"
          placeholder="Ej: 312 345 6789"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />

        <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
          <TextField
            fullWidth
            label="N° de Personas"
            type="number"
            inputProps={{ min: 1, max: 30 }}
            value={guestsCount}
            onChange={(e) => setGuestsCount(Number(e.target.value))}
          />
          <TextField
            fullWidth
            label="Fecha y Hora"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={reservationDate}
            onChange={(e) => setReservationDate(e.target.value)}
          />
        </Box>

        <TextField
          fullWidth
          margin="dense"
          label="Notas o Solicitudes Especiales"
          placeholder="Ej: Cumpleaños, traer silla de bebé"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'Guardando...' : 'Confirmar Reserva'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
