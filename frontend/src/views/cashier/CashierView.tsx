import React, { useState, useEffect } from 'react';
import {
  Box, AppBar, Toolbar, Typography, Grid, Card, CardContent, CardActionArea,
  Button, ButtonGroup, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, List, ListItem, ListItemText, Chip, Alert, IconButton, FormControl,
  FormLabel, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useAuthStore } from '../../stores/useAuthStore';
import { socket } from '../../sockets/socket';
import { ThermalReceiptModal, ReceiptData } from '../../components/ThermalReceiptModal';
import { CashierShiftBanner } from './CashierShiftBanner';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { name: string };
  modifiers?: { id?: string; name: string; price: number }[];
}

interface TableOrder {
  id: string;
  orderNumber: number;
  subtotal: number;
  total: number;
  user: { id: string; name: string; documentId: string };
  items: OrderItem[];
}

interface TableData {
  id: string;
  number: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'WAITING_BILL' | 'RESERVED' | 'MERGED';
  mergedIntoId?: string | null;
  mergedInto?: { id: string; number: number } | null;
  mergedTables?: { id: string; number: number; capacity: number }[];
  orders: TableOrder[];
}

export const CashierView: React.FC = () => {
  const { logout } = useAuthStore();
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);

  // Estados de cobro
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [customTip, setCustomTip] = useState<string>('');
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados de Tickets Térmicos
  const [preBillData, setPreBillData] = useState<ReceiptData | null>(null);
  const [paidReceiptData, setPaidReceiptData] = useState<ReceiptData | null>(null);

  // Estado del Turno de Caja
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [shiftRefreshKey, setShiftRefreshKey] = useState(0);

  useEffect(() => {
    fetchTables();

    socket.emit('join:room', 'room:waiters');
    socket.on('table:status_changed', fetchTables);
    socket.on('tables:updated', fetchTables);

    return () => {
      socket.off('table:status_changed', fetchTables);
      socket.off('tables:updated', fetchTables);
    };
  }, []);

  const fetchTables = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/tables', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTables(await res.json());
    }
  };

  const handleOpenPayModal = (table: TableData) => {
    setSelectedTable(table);
    const sub = table.orders.reduce((acc, o) => acc + Number(o.subtotal || 0), 0);
    setTipPercentage(10);
    setCustomTip(String(Math.round(sub * 0.10)));
    setPaymentMethod('EFECTIVO');
  };

  const getTableSubtotal = () => {
    if (!selectedTable?.orders) return 0;
    return selectedTable.orders.reduce((acc, o) => acc + Number(o.subtotal || 0), 0);
  };

  const calculateTip = () => {
    const sub = getTableSubtotal();
    if (customTip !== '') return Number(customTip) || 0;
    return (sub * tipPercentage) / 100;
  };

  const handleSelectTipPercent = (pct: number) => {
    setTipPercentage(pct);
    const sub = getTableSubtotal();
    setCustomTip(String(Math.round((sub * pct) / 100)));
  };

  const handleProcessPayment = async () => {
    if (!selectedTable) return;
    setPaying(true);
    try {
      const token = localStorage.getItem('token');
      const tipAmount = calculateTip();

      // Cobrar toda la mesa
      const res = await fetch(`/api/tables/${selectedTable.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipAmount, paymentMethod }),
      });

      if (res.ok) {
        setShiftRefreshKey((prev) => prev + 1);
        setSuccessMsg(`¡Mesa ${selectedTable.number} cobrada con éxito! Mesa liberada.`);
        setPaidReceiptData({
          tableNumber: selectedTable.number,
          mergedTables: selectedTable.mergedTables?.map((m) => m.number),
          waiterName: assignedWaiter?.name || 'Atención General',
          items: allItems.map((it) => ({
            name: it.product.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
            modifiers: it.modifiers,
          })),
          subtotal,
          tipAmount,
          total: totalToPay,
          paymentMethod,
          paidAt: new Date().toISOString(),
        });
        setSelectedTable(null);
        await fetchTables();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } finally {
      setPaying(false);
    }
  };

  const handleOpenPreBill = (table: TableData) => {
    const tableSub = table.orders.reduce((acc, o) => acc + Number(o.subtotal || 0), 0);
    const waiter = table.orders[0]?.user;
    const items = table.orders.flatMap((o) => o.items).map((it) => ({
      name: it.product.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
      modifiers: it.modifiers,
    }));
    setPreBillData({
      tableNumber: table.number,
      mergedTables: table.mergedTables?.map((m) => m.number),
      waiterName: waiter?.name || 'Atención General',
      items,
      subtotal: tableSub,
      tipAmount: Math.round(tableSub * 0.1),
      total: tableSub + Math.round(tableSub * 0.1),
    });
  };

  // Liberación forzada en caso de mesas trabadas sin comandas
  const handleForceRelease = async (tableId: string, tableNumber: number) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/tables/${tableId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tipAmount: 0 }),
    });
    setSuccessMsg(`¡Mesa ${tableNumber} desbloqueada y puesta en disponible!`);
    await fetchTables();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const activeTables = tables.filter((t) => t.status !== 'AVAILABLE' && t.status !== 'MERGED');
  const waitingBillTables = activeTables.filter((t) => t.status === 'WAITING_BILL');
  const otherOccupied = activeTables.filter((t) => t.status !== 'WAITING_BILL');

  const subtotal = getTableSubtotal();
  const tipAmount = calculateTip();
  const totalToPay = subtotal + tipAmount;
  const allItems = selectedTable?.orders?.flatMap((o) => o.items) || [];
  const assignedWaiter = selectedTable?.orders?.[0]?.user;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8' }}>
      <AppBar position="static" sx={{ bgcolor: '#1b5e20' }}>
        <Toolbar>
          <PointOfSaleIcon sx={{ mr: 1, fontSize: 30 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Terminal de Caja (Cobros y Facturación)
          </Typography>
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
        {successMsg && <Alert severity="success" sx={{ mb: 3, fontWeight: 'bold' }}>{successMsg}</Alert>}

        {/* Banner de Arqueo y Estado de Turno de Caja */}
        <CashierShiftBanner
          onShiftStateChange={setIsShiftOpen}
          refreshTrigger={shiftRefreshKey}
        />

        {/* Sección 1: Mesas que están pidiendo la cuenta */}
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          🔔 Cuentas Solicitadas por Meseros ({waitingBillTables.length})
        </Typography>

        {waitingBillTables.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            No hay mesas pidiendo la cuenta en este momento.
          </Alert>
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {waitingBillTables.map((table) => {
              const tableSub = table.orders.reduce((acc, o) => acc + Number(o.subtotal || 0), 0);
              const waiter = table.orders[0]?.user;
              return (
                <Grid item xs={12} sm={6} md={4} key={table.id}>
                  <Card sx={{ borderRadius: 3, boxShadow: 4, borderTop: '6px solid #ed6c02', bgcolor: '#fff8e1' }}>
                    <CardActionArea onClick={() => handleOpenPayModal(table)} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5" fontWeight="bold">
                          Mesa {table.number}
                          {table.mergedTables && table.mergedTables.length > 0 && (
                            <Typography component="span" variant="body2" sx={{ color: 'secondary.main', ml: 1, fontWeight: 'bold' }}>
                              (+{table.mergedTables.map((m) => `M${m.number}`).join(', ')})
                            </Typography>
                          )}
                        </Typography>
                        <Chip label="PIDIENDO CUENTA" color="warning" size="small" sx={{ fontWeight: 'bold' }} />
                      </Box>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        Mesero: <strong>{waiter?.name || 'Asignado'}</strong> ({waiter?.documentId || 'S/N'})
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total a cobrar:</Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          ${tableSub.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Button fullWidth variant="contained" color="warning" sx={{ fontWeight: 'bold', borderRadius: 2 }}>
                          Cobrar en Caja
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreBill(table);
                          }}
                          title="Imprimir Pre-cuenta"
                          sx={{ minWidth: 44, borderRadius: 2, bgcolor: '#ffffff' }}
                        >
                          <PrintIcon fontSize="small" />
                        </Button>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Sección 2: Otras Mesas Ocupadas */}
        <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ mb: 2 }}>
          🍽️ Otras Mesas Ocupadas ({otherOccupied.length})
        </Typography>

        <Grid container spacing={2}>
          {otherOccupied.map((table) => {
            const tableSub = table.orders.reduce((acc, o) => acc + Number(o.subtotal || 0), 0);
            const waiter = table.orders[0]?.user;
            return (
              <Grid item xs={12} sm={6} md={4} key={table.id}>
                <Card sx={{ borderRadius: 3, boxShadow: 2, borderTop: '6px solid #d32f2f' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        Mesa {table.number}
                        {table.mergedTables && table.mergedTables.length > 0 && (
                          <Typography component="span" variant="body2" sx={{ color: 'secondary.main', ml: 1, fontWeight: 'bold' }}>
                            (+{table.mergedTables.map((m) => `M${m.number}`).join(', ')})
                          </Typography>
                        )}
                      </Typography>
                      <Chip label="En Consumo" size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Mesero: {waiter?.name || 'Sin comanda'}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                      ${tableSub.toLocaleString()}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleOpenPayModal(table)}
                      >
                        Cobrar Cuenta
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        onClick={() => handleOpenPreBill(table)}
                        title="Imprimir Pre-cuenta"
                      >
                        <PrintIcon fontSize="small" />
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        title="Desbloquear mesa si quedó trabada"
                        onClick={() => handleForceRelease(table.id, table.number)}
                      >
                        <LockOpenIcon fontSize="small" />
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Modal de Cobro */}
        <Dialog open={Boolean(selectedTable)} onClose={() => setSelectedTable(null)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight="bold">
            💵 Liquidar Cuenta — Mesa {selectedTable?.number}
          </DialogTitle>
          <DialogContent dividers>
            {!isShiftOpen && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                ⚠️ <strong>Caja cerrada:</strong> No hay un turno abierto. Este cobro no quedará asociado a ningún arqueo diario.
              </Alert>
            )}

            {/* Responsable */}
            <Box sx={{ bgcolor: '#e8f5e9', p: 1.5, borderRadius: 2, mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Mesero responsable (acreditación de propina):
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="success.dark">
                {assignedWaiter?.name || 'Mesero'} — Cédula: {assignedWaiter?.documentId || 'S/N'}
              </Typography>
            </Box>

            {/* Detalle de ítems de todas las rondas */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Detalle de consumo ({allItems.length} platillos):
            </Typography>
            <List dense sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: '#fafafa', borderRadius: 2, mb: 2 }}>
              {allItems.map((item, idx) => (
                <ListItem key={idx} sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={`${item.quantity}x ${item.product.name}`}
                    secondary={
                      <>
                        <span>${Number(item.subtotal).toLocaleString()}</span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span style={{ display: 'block', fontSize: '11px', color: '#1976d2' }}>
                            {item.modifiers.map((m) => m.name + (m.price > 0 ? ` (+$${Number(m.price).toLocaleString()})` : '')).join(', ')}
                          </span>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">Subtotal comanda:</Typography>
              <Typography variant="h6" fontWeight="bold">${subtotal.toLocaleString()}</Typography>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Propina */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Propina Voluntaria:
            </Typography>
            <ButtonGroup fullWidth variant="outlined" sx={{ mb: 1.5 }}>
              <Button
                variant={tipPercentage === 10 ? 'contained' : 'outlined'}
                onClick={() => handleSelectTipPercent(10)}
              >
                10% (${Math.round(subtotal * 0.10).toLocaleString()})
              </Button>
              <Button
                variant={tipPercentage === 15 ? 'contained' : 'outlined'}
                onClick={() => handleSelectTipPercent(15)}
              >
                15% (${Math.round(subtotal * 0.15).toLocaleString()})
              </Button>
              <Button
                variant={tipPercentage === 0 ? 'contained' : 'outlined'}
                onClick={() => handleSelectTipPercent(0)}
              >
                $0
              </Button>
            </ButtonGroup>

            <TextField
              fullWidth
              size="small"
              label="Monto manual de propina ($)"
              type="number"
              value={customTip}
              onChange={(e) => {
                setCustomTip(e.target.value);
                setTipPercentage(-1);
              }}
              sx={{ mb: 2 }}
            />

            {/* Medio de Pago */}
            <FormControl component="fieldset" sx={{ mb: 1 }}>
              <FormLabel component="legend" sx={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                Medio de Pago:
              </FormLabel>
              <RadioGroup
                row
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
              >
                <FormControlLabel value="EFECTIVO" control={<Radio size="small" />} label="Efectivo" />
                <FormControlLabel value="TARJETA" control={<Radio size="small" />} label="Tarjeta" />
                <FormControlLabel value="TRANSFERENCIA" control={<Radio size="small" />} label="Transferencia" />
              </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Total Cobrado:</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                ${totalToPay.toLocaleString()}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={() => setSelectedTable(null)}>Cancelar</Button>
            {selectedTable && (
              <Button
                variant="outlined"
                color="info"
                startIcon={<ReceiptIcon />}
                onClick={() => handleOpenPreBill(selectedTable)}
              >
                Ver Pre-cuenta
              </Button>
            )}
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={handleProcessPayment}
              disabled={paying}
              sx={{ py: 1.2, fontWeight: 'bold', borderRadius: 2 }}
            >
              {paying ? 'Procesando...' : 'Completar Pago y Liberar Mesa'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Pre-cuenta Térmica */}
        {preBillData && (
          <ThermalReceiptModal
            open={Boolean(preBillData)}
            onClose={() => setPreBillData(null)}
            type="PRE_BILL"
            data={preBillData}
          />
        )}

        {/* Modal de Factura Final / Ticket de Venta */}
        {paidReceiptData && (
          <ThermalReceiptModal
            open={Boolean(paidReceiptData)}
            onClose={() => setPaidReceiptData(null)}
            type="FINAL_RECEIPT"
            data={paidReceiptData}
          />
        )}
      </Box>
    </Box>
  );
};
