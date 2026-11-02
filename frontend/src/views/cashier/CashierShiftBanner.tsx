import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Chip, Stack, Tooltip, IconButton, CircularProgress
} from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { OpenCashModal } from './OpenCashModal';
import { CloseCashModal } from './CloseCashModal';
import { CorteZReceiptModal, CorteZData } from './CorteZReceiptModal';

interface Props {
  onShiftStateChange?: (isOpen: boolean) => void;
  refreshTrigger?: number;
}

export const CashierShiftBanner: React.FC<Props> = ({ onShiftStateChange, refreshTrigger = 0 }) => {
  const [shiftData, setShiftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [corteZModalVisible, setCorteZModalVisible] = useState(false);
  const [closedShiftResult, setClosedShiftResult] = useState<CorteZData | null>(null);

  const fetchShift = useCallback(async () => {
    try {
      const res = await fetch('/api/cash/current', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setShiftData(data);
        if (onShiftStateChange) {
          onShiftStateChange(Boolean(data.shift));
        }
      } else {
        setShiftData({ shift: null });
        if (onShiftStateChange) {
          onShiftStateChange(false);
        }
      }
    } catch {
      setShiftData({ shift: null });
      if (onShiftStateChange) {
        onShiftStateChange(false);
      }
    } finally {
      setLoading(false);
    }
  }, [onShiftStateChange]);

  useEffect(() => {
    fetchShift();
  }, [fetchShift, refreshTrigger]);

  const handleOpenSuccess = () => {
    fetchShift();
  };

  const handleCloseSuccess = (result: any) => {
    setClosedShiftResult(result.shift);
    setCorteZModalVisible(true);
    fetchShift();
  };

  if (loading) {
    return (
      <Paper sx={{ p: 1.5, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Verificando estado de la caja...</Typography>
      </Paper>
    );
  }

  const shift = shiftData?.shift;
  const live = shiftData?.liveTotals || {};

  // CASO 1: CAJA CERRADA
  if (!shift) {
    return (
      <>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: '#fff3e0',
            border: '1px solid #ffe082',
            borderRadius: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PointOfSaleIcon sx={{ fontSize: 36, color: '#f57c00' }} />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="#e65100">
                La caja se encuentra cerrada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Abre un turno con la base en efectivo para registrar ventas y permitir el cuadre al final del día.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="warning"
            startIcon={<LockOpenIcon />}
            onClick={() => setOpenModalVisible(true)}
            sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            Abrir Turno de Caja
          </Button>
        </Paper>

        <OpenCashModal
          open={openModalVisible}
          onClose={() => setOpenModalVisible(false)}
          onSuccess={handleOpenSuccess}
        />
      </>
    );
  }

  // CASO 2: CAJA ABIERTA
  const openedTimeStr = new Date(shift.openedAt).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: '#f1f8e9',
          border: '1px solid #c8e6c9',
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', lg: 'center' },
            gap: 2,
          }}
        >
          {/* Info responsable */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              icon={<PointOfSaleIcon />}
              label="CAJA ACTIVA"
              color="success"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
            <Box>
              <Typography variant="body2">
                Responsable: <strong>{shift.openedBy?.name}</strong> • Abierta: <strong>{openedTimeStr}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {live.ordersCount || 0} órdenes cobradas en este turno
              </Typography>
            </Box>
          </Box>

          {/* Métricas en vivo */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ flexWrap: 'wrap', alignItems: 'center' }}
          >
            <Chip
              icon={<AttachMoneyIcon fontSize="small" />}
              label={`Base: $${Number(shift.initialCash).toLocaleString()}`}
              variant="outlined"
              size="small"
              sx={{ bgcolor: 'white' }}
            />
            <Chip
              icon={<AttachMoneyIcon fontSize="small" />}
              label={`Efectivo: +$${(live.salesCash || 0).toLocaleString()}`}
              color="success"
              variant="outlined"
              size="small"
              sx={{ bgcolor: 'white', fontWeight: 'bold' }}
            />
            <Chip
              icon={<CreditCardIcon fontSize="small" />}
              label={`Tarjeta: $${(live.salesCard || 0).toLocaleString()}`}
              variant="outlined"
              size="small"
              sx={{ bgcolor: 'white' }}
            />
            <Chip
              icon={<AccountBalanceWalletIcon fontSize="small" />}
              label={`Transf: $${(live.salesTrans || 0).toLocaleString()}`}
              variant="outlined"
              size="small"
              sx={{ bgcolor: 'white' }}
            />

            <Box
              sx={{
                bgcolor: '#2e7d32',
                color: 'white',
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Gaveta Físico: ${(live.expectedCash || 0).toLocaleString()}
            </Box>
          </Stack>

          {/* Acciones */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Actualizar arqueo en vivo">
              <IconButton size="small" onClick={fetchShift} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<LockIcon />}
              onClick={() => setCloseModalVisible(true)}
              sx={{ fontWeight: 'bold' }}
            >
              Cerrar Caja / Arqueo
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Modal de Cierre de Caja */}
      <CloseCashModal
        open={closeModalVisible}
        onClose={() => setCloseModalVisible(false)}
        shiftData={shiftData}
        onSuccess={handleCloseSuccess}
      />

      {/* Modal de Tirilla Térmica Corte Z */}
      <CorteZReceiptModal
        open={corteZModalVisible}
        onClose={() => setCorteZModalVisible(false)}
        data={closedShiftResult}
      />
    </>
  );
};
