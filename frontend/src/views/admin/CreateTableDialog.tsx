import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, Box, Typography
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { useTableStore } from '../../stores/useTableStore';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTableDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const { tables, createTable } = useTableStore();
  
  // Calcular sugerencia de siguiente número de mesa
  const nextTableNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;

  const [tableNumber, setTableNumber] = useState<string>(String(nextTableNumber));
  const [capacity, setCapacity] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!capacity || capacity < 1) {
      setError('La capacidad debe ser de al menos 1 persona.');
      return;
    }

    setLoading(true);
    try {
      const result = await createTable({
        number: tableNumber ? Number(tableNumber) : undefined,
        capacity,
      });

      if (!result.success) {
        setError(result.error || 'Error al crear la mesa.');
      } else {
        onSuccess?.();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <TableRestaurantIcon color="primary" /> Agregar Nueva Mesa al Salón
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ingresa el número identificador y la cantidad máxima recomendada de comensales.
        </Typography>

        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Número de Mesa"
          type="number"
          placeholder={`Sugerido: ${nextTableNumber}`}
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          helperText="Identificador visible en el plano y para los meseros."
        />

        <TextField
          fullWidth
          margin="dense"
          label="Capacidad de Comensales"
          type="number"
          inputProps={{ min: 1, max: 30 }}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          helperText="Número de sillas de la mesa."
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'Creando...' : 'Crear Mesa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
