import React, { useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Divider
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptIcon from '@mui/icons-material/Receipt';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  modifiers?: { name: string; price?: number }[];
}

export interface ReceiptData {
  restaurantName?: string;
  restaurantNit?: string;
  restaurantAddress?: string;
  tableNumber: number;
  mergedTables?: number[];
  orderNumber?: number;
  waiterName: string;
  items: ReceiptItem[];
  subtotal: number;
  tipAmount: number;
  total: number;
  paymentMethod?: string;
  paidAt?: string;
  createdAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  type: 'PRE_BILL' | 'FINAL_RECEIPT';
  data: ReceiptData;
}

export const ThermalReceiptModal: React.FC<Props> = ({
  open,
  onClose,
  type,
  data,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isPreBill = type === 'PRE_BILL';
  const displayDate = data.paidAt
    ? new Date(data.paidAt).toLocaleString('es-CO')
    : new Date().toLocaleString('es-CO');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <ReceiptIcon color="primary" /> {isPreBill ? 'Pre-cuenta de Consumo' : 'Ticket de Venta (Factura)'}
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: '#eceff1', p: { xs: 1.5, sm: 2 } }}>
        {/* ======================================================== */}
        {/* ÁREA DE IMPRESIÓN DEL RECIBO TÉRMICO (80mm)             */}
        {/* ======================================================== */}
        <Box
          id="thermal-receipt-print-area"
          ref={receiptRef}
          sx={{
            width: '100%',
            maxWidth: '320px',
            margin: '0 auto',
            bgcolor: '#ffffff',
            p: 2.5,
            borderRadius: 2,
            boxShadow: 3,
            fontFamily: '"Courier New", Courier, monospace',
            color: '#1a1a1a',
            fontSize: '0.82rem',
            lineHeight: 1.35,
            border: '1px solid #e0e0e0',
            '@media print': {
              boxShadow: 'none',
              border: 'none',
              p: 1,
              maxWidth: '80mm',
              width: '80mm',
            },
          }}
        >
          {/* Encabezado del restaurante */}
          <Box sx={{ textAlign: 'center', mb: 1.5 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: 'inherit', letterSpacing: 1 }}>
              {data.restaurantName || 'RESTAURANTE GOURMET'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'inherit' }}>
              NIT: {data.restaurantNit || '901.458.789-1'} • Régimen Común
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'inherit' }}>
              {data.restaurantAddress || 'Calle Principal # 45 - 20, Zona Rosa'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'inherit' }}>
              Tel: +57 (601) 789 4520
            </Typography>

            <Box sx={{ my: 1, borderBottom: '1px dashed #000' }} />

            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: 'inherit', textTransform: 'uppercase' }}>
              {isPreBill ? '*** PRE-CUENTA (CONSUMO) ***' : '*** COMPROBANTE DE PAGO ***'}
            </Typography>
            {isPreBill && (
              <Typography variant="caption" sx={{ fontFamily: 'inherit', fontStyle: 'italic', display: 'block' }}>
                (No válida como factura final)
              </Typography>
            )}
          </Box>

          {/* Datos de la mesa y servicio */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Fecha:</span>
              <span>{displayDate}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Mesa:</span>
              <span>
                Mesa {data.tableNumber}
                {data.mergedTables && data.mergedTables.length > 0 && ` (+M${data.mergedTables.join(', ')})`}
              </span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Mesero:</span>
              <span>{data.waiterName || 'Atención General'}</span>
            </Box>
            {data.orderNumber && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Comanda #:</span>
                <span>{data.orderNumber}</span>
              </Box>
            )}
          </Box>

          <Box sx={{ my: 1, borderBottom: '1px dashed #000' }} />

          {/* Encabezado de columnas de platos */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mb: 0.5 }}>
            <span style={{ width: '55%' }}>CANT / DESCRIPCIÓN</span>
            <span style={{ width: '45%', textAlign: 'right' }}>VALOR</span>
          </Box>
          <Box sx={{ borderBottom: '1px solid #ccc', mb: 1 }} />

          {/* Lista de productos */}
          {data.items.length === 0 ? (
            <Typography variant="caption" sx={{ fontFamily: 'inherit', textAlign: 'center', display: 'block', py: 1 }}>
              Sin platos registrados
            </Typography>
          ) : (
            data.items.map((item, idx) => (
              <Box key={idx} sx={{ mb: 0.8 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ width: '60%', fontWeight: 600 }}>
                    {item.quantity}x {item.name}
                  </span>
                  <span style={{ width: '40%', textAlign: 'right' }}>
                    ${item.subtotal.toLocaleString()}
                  </span>
                </Box>
                {item.quantity > 1 && (
                  <Typography variant="caption" sx={{ fontFamily: 'inherit', color: 'text.secondary', pl: 2, display: 'block' }}>
                    (${item.unitPrice.toLocaleString()} c/u)
                  </Typography>
                )}
                {item.modifiers && item.modifiers.length > 0 && (
                  <Box sx={{ pl: 2, fontSize: '11px', color: '#444' }}>
                    {item.modifiers.map((m, mIdx) => (
                      <div key={mIdx}>
                        • {m.name} {m.price && m.price > 0 ? `(+$${Number(m.price).toLocaleString()})` : ''}
                      </div>
                    ))}
                  </Box>
                )}
              </Box>
            ))
          )}

          <Box sx={{ my: 1, borderBottom: '1px dashed #000' }} />

          {/* Totales */}
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>SUBTOTAL:</span>
              <span>${data.subtotal.toLocaleString()}</span>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>{isPreBill ? 'PROPINA SUGERIDA (10%):' : 'PROPINA:'}</span>
              <span>${data.tipAmount.toLocaleString()}</span>
            </Box>

            <Box sx={{ borderBottom: '1px solid #000', my: 0.5 }} />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 'bold',
                my: 0.5,
              }}
            >
              <span>TOTAL {isPreBill ? 'SUGERIDO' : 'PAGADO'}:</span>
              <span>${data.total.toLocaleString()}</span>
            </Box>

            {!isPreBill && data.paymentMethod && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, fontStyle: 'italic' }}>
                <span>Método de Pago:</span>
                <span>{data.paymentMethod}</span>
              </Box>
            )}
          </Box>

          <Box sx={{ my: 1.5, borderBottom: '1px dashed #000' }} />

          {/* Pie del ticket */}
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'inherit', fontWeight: 'bold' }}>
              ¡GRACIAS POR SU PREFERENCIA!
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontFamily: 'inherit', fontSize: '0.7rem' }}>
              Software Gastronómico • Impreso en terminal POS
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{ fontWeight: 'bold' }}
        >
          Imprimir Ticket
        </Button>
      </DialogActions>

      {/* Estilos CSS globales para aislamiento en impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-print-area, #thermal-receipt-print-area * {
            visibility: visible !important;
          }
          #thermal-receipt-print-area {
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
