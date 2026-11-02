import React, { useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Divider
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import AssessmentIcon from '@mui/icons-material/Assessment';

export interface CorteZData {
  id: string;
  openedAt: string;
  closedAt: string;
  openedBy?: { name: string };
  initialCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesTrans: number;
  totalTips: number;
  ordersCount: number;
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  data: CorteZData | null;
}

export const CorteZReceiptModal: React.FC<Props> = ({ open, onClose, data }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalSales =
    Number(data.totalSalesCash || 0) +
    Number(data.totalSalesCard || 0) +
    Number(data.totalSalesTrans || 0);

  const diff = Number(data.difference || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <AssessmentIcon color="warning" /> Tirilla de Corte Z (Cierre de Caja)
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#eceff1', p: { xs: 1.5, sm: 2 } }}>
        <Box
          id="cortez-receipt-print-area"
          ref={receiptRef}
          sx={{
            width: '100%',
            maxWidth: '320px',
            margin: '0 auto',
            bgcolor: '#ffffff',
            p: 2.5,
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '13px',
            color: '#111',
            lineHeight: 1.35,
          }}
        >
          {/* Encabezado */}
          <Box sx={{ textAlign: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '16px', letterSpacing: '0.5px' }}>
              RESTAURANTE GOURMET
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#555' }}>NIT: 900.123.456-7</Typography>
            <Typography sx={{ fontSize: '11px', color: '#555' }}>
              ================================
            </Typography>
            <Typography sx={{ fontWeight: 'bold', fontSize: '14px', my: 0.5 }}>
              *** CORTE Z - CIERRE DE TURNO ***
            </Typography>
            <Typography sx={{ fontSize: '11px', color: '#555' }}>
              ================================
            </Typography>
          </Box>

          {/* Información del Turno */}
          <Box sx={{ mb: 1.5, fontSize: '12px' }}>
            <div>
              <strong>Responsable:</strong> {data.openedBy?.name || 'Cajero'}
            </div>
            <div>
              <strong>Apertura:</strong>{' '}
              {new Date(data.openedAt).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </div>
            <div>
              <strong>Cierre:</strong>{' '}
              {new Date(data.closedAt).toLocaleString('es-CO', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </div>
            <div>
              <strong>Órdenes Cobradas:</strong> {data.ordersCount}
            </div>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

          {/* Desglose de Ventas por Medio de Pago */}
          <Typography sx={{ fontWeight: 'bold', fontSize: '12px', mb: 0.5 }}>
            VENTAS POR FORMA DE PAGO:
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <span>Efectivo:</span>
            <span>${Number(data.totalSalesCash || 0).toLocaleString()}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <span>Tarjeta / Datáfono:</span>
            <span>${Number(data.totalSalesCard || 0).toLocaleString()}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <span>Transferencias:</span>
            <span>${Number(data.totalSalesTrans || 0).toLocaleString()}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <span>Propinas Totales:</span>
            <span>${Number(data.totalTips || 0).toLocaleString()}</span>
          </Box>
          <Divider sx={{ borderStyle: 'dotted', my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mb: 1 }}>
            <span>TOTAL FACTURADO:</span>
            <span>${totalSales.toLocaleString()}</span>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

          {/* Arqueo de Dinero en Efectivo */}
          <Typography sx={{ fontWeight: 'bold', fontSize: '12px', mb: 0.5 }}>
            CUADRE DE CAJA (GAVETA EFECTIVO):
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <span>(+) Base Inicial:</span>
            <span>${Number(data.initialCash || 0).toLocaleString()}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <span>(+) Ventas Efectivo:</span>
            <span>${Number(data.totalSalesCash || 0).toLocaleString()}</span>
          </Box>
          <Divider sx={{ borderStyle: 'dotted', my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mb: 0.5 }}>
            <span>(=) Efectivo Esperado:</span>
            <span>${Number(data.expectedCash || 0).toLocaleString()}</span>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mb: 0.5 }}>
            <span>(✓) Efectivo Contado:</span>
            <span>${Number(data.actualCash || 0).toLocaleString()}</span>
          </Box>
          <Divider sx={{ borderStyle: 'dotted', my: 0.5 }} />

          {/* Resultado de la diferencia */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '13px',
              mt: 1,
              p: 0.8,
              bgcolor: '#f5f5f5',
              border: '1px solid #ddd',
            }}
          >
            <span>DIFERENCIA:</span>
            <span>
              {diff === 0
                ? 'CUADRADO ($0)'
                : diff > 0
                ? `SOBRANTE: +$${diff.toLocaleString()}`
                : `FALTANTE: -$${Math.abs(diff).toLocaleString()}`}
            </span>
          </Box>

          {data.notes && (
            <Box sx={{ mt: 1.5, fontSize: '11px', color: '#444' }}>
              <strong>Notas:</strong> {data.notes}
            </Box>
          )}

          {/* Firmas */}
          <Box sx={{ mt: 4, pt: 1, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <div style={{ borderBottom: '1px solid #444', width: '80%', margin: '0 auto 4px auto' }} />
              <Typography sx={{ fontSize: '10px' }}>Firma Cajero Entregante</Typography>
            </Box>
            <Box>
              <div style={{ borderBottom: '1px solid #444', width: '80%', margin: '0 auto 4px auto' }} />
              <Typography sx={{ fontSize: '10px' }}>Firma Administrador / Recibido</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ fontWeight: 'bold' }}
        >
          Imprimir Corte Z (80mm)
        </Button>
      </DialogActions>

      {/* Reglas de impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cortez-receipt-print-area, #cortez-receipt-print-area * {
            visibility: visible !important;
          }
          #cortez-receipt-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 5mm !important;
            font-size: 11pt !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </Dialog>
  );
};
