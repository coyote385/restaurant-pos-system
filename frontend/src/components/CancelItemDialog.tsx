import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, FormControl, FormLabel, RadioGroup,
  FormControlLabel, Radio, TextField, FormControlLabel as CheckboxLabel,
  Checkbox, Alert, Divider
} from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const CANCELLATION_REASONS = [
  'Error de digitación / comanda',
  'Plato quemado o defectuoso en cocina',
  'Cliente desistió por demora excesiva',
  'Falta de insumo o producto agotado',
  'Cambio de plato solicitado por el cliente',
  'Otro motivo',
];

interface Props {
  open: boolean;
  item: {
    id: string;
    productName: string;
    quantity: number;
    subtotal: number;
    status?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancelItemDialog: React.FC<Props> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [isWaste, setIsWaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determinar si ya estaba preparado
  React.useEffect(() => {
    if (item) {
      const alreadyInKitchen = item.status === 'IN_PREPARATION' || item.status === 'READY';
      setIsWaste(alreadyInKitchen);
      setReason(alreadyInKitchen ? CANCELLATION_REASONS[1] : CANCELLATION_REASONS[0]);
      setNotes('');
      setError(null);
    }
  }, [item, open]);

  if (!item) return null;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/waste/cancel-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          orderItemId: item.id,
          reason,
          notes: notes.trim() || undefined,
          isWaste,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al anular ítem.');
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', color: 'error.main' }}>
        <DeleteForeverIcon color="error" /> Justificar Anulación de Platillo
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ bgcolor: '#fff3e0', p: 1.5, borderRadius: 2, mb: 2, border: '1px solid #ffe082' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {item.quantity}x {item.productName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Valor a descontar: <strong>${Number(item.subtotal).toLocaleString()}</strong>
          </Typography>
        </Box>

        <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '0.9rem', mb: 0.5 }}>
            Motivo Obligatorio de Cancelación:
          </FormLabel>
          <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)}>
            {CANCELLATION_REASONS.map((r) => (
              <FormControlLabel
                key={r}
                value={r}
                control={<Radio size="small" />}
                label={<Typography variant="body2">{r}</Typography>}
              />
            ))}
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ bgcolor: isWaste ? '#ffebee' : '#f5f5f5', p: 1.2, borderRadius: 2, mb: 2 }}>
          <CheckboxLabel
            control={
              <Checkbox
                checked={isWaste}
                color="error"
                onChange={(e) => setIsWaste(e.target.checked)}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight="bold" color={isWaste ? 'error.dark' : 'text.primary'}>
                  ¿Hubo desperdicio o pérdida de materia prima?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Si marcas esta casilla, se registrará como pérdida contable en el panel de auditoría.
                </Typography>
              </Box>
            }
          />
        </Box>

        <TextField
          fullWidth
          margin="dense"
          label="Observaciones adicionales (Opcional)"
          placeholder="Ej: El cliente tuvo que retirarse por una urgencia"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Regresar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'Anulando...' : 'Confirmar Anulación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
