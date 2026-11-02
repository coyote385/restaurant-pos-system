import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, Typography, Box
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OpenCashModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [initialCash, setInitialCash] = useState<string>('100000');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const amount = Number(initialCash);
    if (isNaN(amount) || amount < 0) {
      setError('La base de efectivo no puede ser negativa.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cash/open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          initialCash: amount,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al abrir la caja.');
        return;
      }

      onSuccess();
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
        <LockOpenIcon color="success" /> Apertura de Turno de Caja
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ingresa la base en efectivo con la que inicia la gaveta de caja para dar cambio a los clientes.
        </Typography>

        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Base Inicial en Efectivo ($)"
          type="number"
          placeholder="100000"
          value={initialCash}
          onChange={(e) => setInitialCash(e.target.value)}
          InputProps={{
            startAdornment: <AttachMoneyIcon sx={{ color: 'action.active', mr: 0.5 }} />,
          }}
          helperText="Dinero físico presente en la gaveta antes de la primera venta."
        />

        <TextField
          fullWidth
          margin="dense"
          label="Notas de Apertura (Opcional)"
          placeholder="Ej: Turno de la tarde, billetes de baja denominación"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'Abriendo...' : 'Confirmar Apertura'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
