import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, Typography
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Table, useTableStore } from '../../stores/useTableStore';

interface Props {
  open: boolean;
  onClose: () => void;
  table: Table;
  onSuccess?: () => void;
}

export const EditTableDialog: React.FC<Props> = ({ open, onClose, table, onSuccess }) => {
  const { updateTable } = useTableStore();
  const [tableNumber, setTableNumber] = useState<string>(String(table.number));
  const [capacity, setCapacity] = useState<number>(table.capacity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTableNumber(String(table.number));
    setCapacity(table.capacity);
  }, [table]);

  const handleSubmit = async () => {
    setError(null);
    if (!capacity || capacity < 1) {
      setError('La capacidad debe ser de al menos 1 persona.');
      return;
    }
    if (!tableNumber) {
      setError('El número de mesa es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const result = await updateTable(table.id, {
        number: Number(tableNumber),
        capacity,
      });

      if (!result.success) {
        setError(result.error || 'Error al actualizar la mesa.');
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
        <EditIcon color="primary" /> Configurar Mesa {table.number}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Número de Mesa"
          type="number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />

        <TextField
          fullWidth
          margin="dense"
          label="Capacidad de Comensales"
          type="number"
          inputProps={{ min: 1, max: 30 }}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
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
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
