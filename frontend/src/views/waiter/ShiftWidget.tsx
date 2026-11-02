import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Divider, Alert, Chip
} from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface ShiftData {
  id: string;
  openedAt: string;
  liveTotalSales: number;
  liveTotalTips: number;
  liveOrdersCount: number;
  user: { name: string };
}

interface ShiftWidgetProps {
  onShiftChange?: () => void;
}

export const ShiftWidget: React.FC<ShiftWidgetProps> = ({ onShiftChange }) => {
  const [shift, setShift] = useState<ShiftData | null>(null);
  const [loading, setLoading] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closedSummary, setClosedSummary] = useState<any>(null);

  const fetchCurrentShift = useCallback(async () => {
    const res = await fetch('/api/shifts/my-current', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) {
      setShift(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shifts/open', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        await fetchCurrentShift();
        onShiftChange?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shifts/close', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClosedSummary(data);
        setShift(null);
        setCloseModalOpen(true);
        onShiftChange?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const shiftDuration = shift
    ? Math.floor((Date.now() - new Date(shift.openedAt).getTime()) / 60000)
    : 0;

  if (!shift) {
    return (
      <>
        <Button
          color="inherit"
          startIcon={<PlayCircleIcon />}
          onClick={handleOpenShift}
          disabled={loading}
          sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}
        >
          Iniciar Turno
        </Button>

        {/* Resumen de cierre de turno */}
        <Dialog open={closeModalOpen} onClose={() => setCloseModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight="bold">✅ Turno Cerrado</DialogTitle>
          <DialogContent dividers>
            {closedSummary && (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  ¡Tu turno ha sido cerrado exitosamente!
                </Alert>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Comandas atendidas:</Typography>
                  <Typography fontWeight="bold">{closedSummary.ordersCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Total vendido:</Typography>
                  <Typography fontWeight="bold">${Number(closedSummary.totalSales).toLocaleString()}</Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Propina ganada:</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    ${Number(closedSummary.totalTips).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseModalOpen(false)} variant="contained">Listo</Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
        <Chip
          icon={<AccessTimeIcon sx={{ fontSize: '16px !important' }} />}
          label={`${shiftDuration}min`}
          size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
        />
        <Chip
          label={`$${shift.liveTotalSales.toLocaleString()}`}
          size="small"
          color="success"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      <Button
        color="inherit"
        startIcon={<StopCircleIcon />}
        onClick={handleCloseShift}
        disabled={loading}
        sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,50,50,0.25)', borderRadius: 2 }}
      >
        Cerrar Turno
      </Button>
    </>
  );
};
