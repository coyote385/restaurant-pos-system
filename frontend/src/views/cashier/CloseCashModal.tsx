import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, Typography, Box, Divider, Paper, Chip
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  open: boolean;
  onClose: () => void;
  shiftData: any;
  onSuccess: (closedSummary: any) => void;
}

export const CloseCashModal: React.FC<Props> = ({
  open,
  onClose,
  shiftData,
  onSuccess,
}) => {
  const shift = shiftData?.shift;
  const live = shiftData?.liveTotals || {};

  const expectedCash = live.expectedCash || Number(shift?.initialCash || 0);

  const [actualCash, setActualCash] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counted = Number(actualCash) || 0;
  const difference = counted - expectedCash;

  const handleSubmit = async () => {
    setError(null);
    if (actualCash.trim() === '') {
      setError('Debes ingresar el valor total del dinero contado en la gaveta.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cash/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          shiftId: shift.id,
          actualCash: counted,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cerrar la caja.');
        return;
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <LockIcon color="warning" /> Cierre y Arqueo de Caja (Corte Z)
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Resumen del turno */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Responsable: <strong>{shift?.openedBy?.name}</strong> • Abierta:{' '}
            {new Date(shift?.openedAt).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Box>

        {/* Desglose de ingresos esperados */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: '#fafafa', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
            Resumen de Movimientos en el Turno:
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
            <Typography variant="body2" color="text.secondary">Base inicial en gaveta:</Typography>
            <Typography variant="body2" fontWeight="bold">${Number(shift?.initialCash || 0).toLocaleString()}</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
            <Typography variant="body2" color="text.secondary">(+) Ventas en Efectivo:</Typography>
            <Typography variant="body2" fontWeight="bold" color="success.dark">
              +${(live.salesCash || 0).toLocaleString()}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body1" fontWeight="bold">Total Esperado en Efectivo:</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">
              ${expectedCash.toLocaleString()}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Otros medios de pago */}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, fontWeight: 'bold' }}>
            Otros medios de pago (No afectan gaveta física):
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">Ventas Tarjeta / Datáfono:</Typography>
            <Typography variant="caption" fontWeight="bold">${(live.salesCard || 0).toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Ventas Transferencia (Nequi/Otros):</Typography>
            <Typography variant="caption" fontWeight="bold">${(live.salesTrans || 0).toLocaleString()}</Typography>
          </Box>
        </Paper>

        {/* Ingreso del dinero contado */}
        <TextField
          autoFocus
          fullWidth
          label="Dinero Físico en Gaveta (Efectivo Contado)"
          type="number"
          placeholder="0"
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          InputProps={{
            startAdornment: <AttachMoneyIcon sx={{ color: 'action.active', mr: 0.5 }} />,
          }}
          helperText="Cuenta el dinero en billetes y monedas que hay físicamente en la gaveta."
          sx={{ mb: 2 }}
        />

        {/* Indicador visual de descuadre */}
        {actualCash.trim() !== '' && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              textAlign: 'center',
              bgcolor:
                difference === 0
                  ? '#e8f5e9'
                  : difference > 0
                  ? '#fff8e1'
                  : '#ffebee',
              border: '1px solid',
              borderColor:
                difference === 0
                  ? '#a5d6a7'
                  : difference > 0
                  ? '#ffe082'
                  : '#ef9a9a',
              mb: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block">
              Resultado del Arqueo:
            </Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={
                difference === 0
                  ? 'success.dark'
                  : difference > 0
                  ? 'warning.dark'
                  : 'error.main'
              }
            >
              {difference === 0
                ? '✅ Caja Cuadrada ($0)'
                : difference > 0
                ? `🟢 Sobrante: +$${difference.toLocaleString()}`
                : `🔴 Faltante: -$${Math.abs(difference).toLocaleString()}`}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          margin="dense"
          label="Observaciones o Notas de Cierre"
          placeholder="Ej: Se entregó el efectivo al administrador, turno sin novedad."
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
          color="warning"
          onClick={handleSubmit}
          disabled={loading || actualCash.trim() === ''}
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'Cerrando...' : 'Confirmar Cierre de Caja'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
