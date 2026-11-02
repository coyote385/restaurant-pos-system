import React, { useState, useEffect } from 'react';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Snackbar, Alert, List, ListItem, ListItemText, Divider, Tooltip, Chip
} from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { TableMapView } from './TableMapView';
import { OrderCartView } from './OrderCartView';
import { ShiftWidget } from './ShiftWidget';
import { MergeTablesDialog } from './MergeTablesDialog';
import { CreateReservationDialog } from '../reservations/CreateReservationDialog';
import { ReservationDetailsDialog } from '../reservations/ReservationDetailsDialog';
import { ThermalReceiptModal } from '../../components/ThermalReceiptModal';
import { CancelItemDialog } from '../../components/CancelItemDialog';
import { Table, useTableStore } from '../../stores/useTableStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { socket } from '../../sockets/socket';

export const WaiterView: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { tables, fetchTables, editMode, setEditMode, unmergeTable } = useTableStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Modal para mesas ocupadas (opciones: agregar platos o pedir cuenta a caja)
  const [occupiedModalOpen, setOccupiedModalOpen] = useState(false);
  const [activeTable, setActiveTable] = useState<any>(null);
  const [requestingBill, setRequestingBill] = useState(false);
  const [billSentMsg, setBillSentMsg] = useState(false);

  // Modales de Unión de Mesas
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [tableForMerge, setTableForMerge] = useState<Table | null>(null);
  const [mergedSecondaryModal, setMergedSecondaryModal] = useState<Table | null>(null);

  // Modales de Reservas
  const [reservedTableModal, setReservedTableModal] = useState<Table | null>(null);
  const [createReservationOpen, setCreateReservationOpen] = useState(false);

  // Modal de Anulación de Plato (Merma)
  const [itemToCancel, setItemToCancel] = useState<any>(null);

  // Modal Pre-cuenta térmica
  const [preBillModalOpen, setPreBillModalOpen] = useState(false);

  // Modal de Propinas del Mesero
  const [tipsModalOpen, setTipsModalOpen] = useState(false);
  const [tipsData, setTipsData] = useState<any>(null);

  // Notificación flotante de plato listo
  const [readyNotification, setReadyNotification] = useState<{
    orderNumber: number;
    tableNumber: number;
    waiterId: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    socket.emit('join:room', 'room:waiters');

    socket.off('order:ready_to_serve');
    socket.on('order:ready_to_serve', (data) => {
      setReadyNotification({
        ...data,
        message: `¡Comanda #${data.orderNumber} lista para servir en Mesa ${data.tableNumber}!`,
      });
    });

    socket.off('order:station_item_ready');
    socket.on('order:station_item_ready', (data) => {
      setReadyNotification({
        orderNumber: data.orderNumber,
        tableNumber: data.tableNumber,
        waiterId: '',
        message: `¡${data.stationLabel}: ${data.productName} listo para servir en Mesa ${data.tableNumber}!`,
      });
    });
  }, []);

  const handleTableClick = (table: any) => {
    if (editMode) return;

    // Si es una mesa secundaria que está unida a otra
    if (table.status === 'MERGED') {
      setMergedSecondaryModal(table);
      return;
    }

    // Si es una mesa reservada
    if (table.status === 'RESERVED') {
      const freshTable = tables.find((t) => t.id === table.id) || table;
      setReservedTableModal(freshTable);
      return;
    }

    if (table.status === 'OCCUPIED' || table.status === 'WAITING_BILL') {
      // Tomar la versión más reciente del store para tener mergedTables actualizado
      const freshTable = tables.find((t) => t.id === table.id) || table;
      setActiveTable(freshTable);
      setOccupiedModalOpen(true);
    } else {
      setSelectedTable(table);
    }
  };

  // Enviar solicitud de cuenta a Caja
  const handleRequestBill = async () => {
    if (!activeTable) return;
    setRequestingBill(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tables/${activeTable.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'WAITING_BILL' }),
      });

      if (res.ok) {
        setOccupiedModalOpen(false);
        setActiveTable(null);
        setBillSentMsg(true);
        await fetchTables();
      }
    } finally {
      setRequestingBill(false);
    }
  };

  const loadMyTips = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/reports/my-tips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTipsData(await res.json());
        setTipsModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnmergeAllActive = async () => {
    if (!activeTable) return;
    await unmergeTable(activeTable.id);
    setOccupiedModalOpen(false);
    setActiveTable(null);
  };

  const handleCancelSuccess = async () => {
    await fetchTables();
    if (activeTable) {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tables', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const freshTables: any[] = await res.json();
        const fresh = freshTables.find((t) => t.id === activeTable.id);
        if (!fresh || fresh.orders.length === 0) {
          setOccupiedModalOpen(false);
          setActiveTable(null);
        } else {
          setActiveTable(fresh);
        }
      }
    }
  };

  const tableSubtotal = activeTable?.orders?.reduce((acc: number, o: any) => acc + Number(o.subtotal || 0), 0) || 0;
  const allItems = activeTable?.orders?.flatMap((o: any) => o.items) || [];
  const activeMergedTables = activeTable?.mergedTables || [];
  const totalActiveCapacity =
    (activeTable?.capacity || 0) +
    activeMergedTables.reduce((a: number, b: any) => a + Number(b.capacity || 0), 0);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🍽️ {isAdmin ? 'Vista Mesas' : `Mesero: ${user?.name}`}
          </Typography>

          {/* Botón Editar Mapa — solo Admin */}
          {isAdmin && !selectedTable && (
            <Tooltip title={editMode ? 'Guardar disposición' : 'Editar mapa de mesas'}>
              <Button
                color="inherit"
                startIcon={editMode ? <CheckIcon /> : <EditIcon />}
                onClick={() => setEditMode(!editMode)}
                sx={{
                  mr: 1,
                  fontWeight: 'bold',
                  bgcolor: editMode ? 'rgba(255,220,0,0.25)' : 'rgba(255,255,255,0.15)',
                  borderRadius: 2,
                }}
              >
                {editMode ? 'Guardar Mapa' : 'Editar Mapa'}
              </Button>
            </Tooltip>
          )}

          {/* ShiftWidget — solo meseros (no admin) */}
          {!isAdmin && <ShiftWidget />}

          {/* Mis Propinas — solo meseros */}
          {!isAdmin && (
            <Button
              color="inherit"
              startIcon={<PaidIcon />}
              onClick={loadMyTips}
              sx={{ mr: 1, fontWeight: 'bold' }}
            >
              Mis Propinas
            </Button>
          )}

          {/* Botón Nueva Reserva */}
          {!selectedTable && (
            <Button
              color="inherit"
              startIcon={<EventAvailableIcon />}
              onClick={() => setCreateReservationOpen(true)}
              sx={{ mr: 1, fontWeight: 'bold' }}
            >
              Reservar Mesa
            </Button>
          )}

          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Vista de mapa o toma de pedido */}
      {selectedTable ? (
        <OrderCartView
          table={selectedTable}
          onBackToMap={() => setSelectedTable(null)}
          onOpenMergeModal={() => {
            setTableForMerge(selectedTable);
            setMergeModalOpen(true);
          }}
        />
      ) : (
        <TableMapView onSelectTable={handleTableClick} editMode={editMode} />
      )}

      {/* Notificación de cuenta enviada a Caja */}
      <Snackbar
        open={billSentMsg}
        autoHideDuration={4000}
        onClose={() => setBillSentMsg(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" sx={{ width: '100%', fontWeight: 'bold' }} onClose={() => setBillSentMsg(false)}>
          🧾 ¡Cuenta solicitada a Caja! La mesa cambiará a Por Cobrar (Amarillo).
        </Alert>
      </Snackbar>

      {/* ======================================================== */}
      {/* MODAL DE OPCIONES DE MESA OCUPADA                        */}
      {/* ======================================================== */}
      <Dialog open={occupiedModalOpen} onClose={() => setOccupiedModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">
          Mesa {activeTable?.number}
          {activeMergedTables.length > 0 && (
            <Chip
              icon={<LinkIcon />}
              label={`+${activeMergedTables.map((m: any) => `M${m.number}`).join(', ')}`}
              size="small"
              color="secondary"
              sx={{ ml: 1, fontWeight: 'bold' }}
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">Estado de la mesa:</Typography>
            <Typography variant="body1" fontWeight="bold" color={activeTable?.status === 'WAITING_BILL' ? 'warning.main' : 'error.main'}>
              {activeTable?.status === 'WAITING_BILL' ? '🟡 Pidiendo la Cuenta en Caja' : '🔴 En Consumo'}
            </Typography>
            {activeMergedTables.length > 0 && (
              <Typography variant="caption" sx={{ color: 'secondary.dark', fontWeight: 'bold' }} display="block">
                👥 Capacidad total unificada: {totalActiveCapacity} personas
              </Typography>
            )}
          </Box>

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            Platos consumidos ({allItems.length}):
          </Typography>
          <List dense sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: '#fafafa', borderRadius: 2, mb: 2 }}>
            {allItems.length === 0 ? (
              <ListItem><ListItemText primary="Sin comandas activas pendientes" /></ListItem>
            ) : (
              allItems.map((item: any, idx: number) => (
                <ListItem
                  key={idx}
                  sx={{ py: 0.5 }}
                  secondaryAction={
                    <Tooltip title="Anular este plato con justificación de merma">
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={() =>
                          setItemToCancel({
                            id: item.id,
                            productName: item.product.name,
                            quantity: item.quantity,
                            subtotal: item.subtotal,
                            status: item.status,
                          })
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={`${item.quantity}x ${item.product.name}`}
                    secondary={
                      <>
                        <span>${Number(item.subtotal).toLocaleString()}</span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span style={{ display: 'block', fontSize: '11px', color: '#1976d2' }}>
                            {item.modifiers.map((m: any) => m.name + (m.price > 0 ? ` (+$${Number(m.price).toLocaleString()})` : '')).join(', ')}
                          </span>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Subtotal acumulado:</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              ${tableSubtotal.toLocaleString()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            color="warning"
            size="large"
            startIcon={<ReceiptLongIcon />}
            onClick={handleRequestBill}
            disabled={requestingBill || activeTable?.status === 'WAITING_BILL'}
            sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 3 }}
          >
            {activeTable?.status === 'WAITING_BILL' ? 'Cuenta Ya Solicitada a Caja' : 'Solicitar Cuenta (Enviar a Caja)'}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddShoppingCartIcon />}
            onClick={() => {
              setOccupiedModalOpen(false);
              setSelectedTable(activeTable);
            }}
          >
            Agregar más platillos a esta mesa
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="primary"
            startIcon={<ReceiptIcon />}
            onClick={() => setPreBillModalOpen(true)}
            sx={{ fontWeight: 'bold' }}
          >
            Imprimir Pre-cuenta (Tirilla)
          </Button>

          <Button
            fullWidth
            variant="text"
            color="secondary"
            startIcon={<LinkIcon />}
            onClick={() => {
              setTableForMerge(activeTable);
              setMergeModalOpen(true);
            }}
          >
            {activeMergedTables.length > 0 ? 'Gestionar Mesas Unidas' : 'Unir con otra Mesa (Grupo Grande)'}
          </Button>

          {activeMergedTables.length > 0 && (
            <Button
              fullWidth
              size="small"
              color="error"
              startIcon={<LinkOffIcon />}
              onClick={handleUnmergeAllActive}
            >
              Desunir mesas agregadas
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: MESA SECUNDARIA UNIDA A OTRA                     */}
      {/* ======================================================== */}
      <Dialog open={Boolean(mergedSecondaryModal)} onClose={() => setMergedSecondaryModal(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <LinkIcon color="secondary" /> Mesa {mergedSecondaryModal?.number} (Mesa Unida)
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta mesa se encuentra unida a la <strong>Mesa {mergedSecondaryModal?.mergedInto?.number}</strong> para atender a un grupo de comensales.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Todas las comandas y la cuenta se gestionan centralizadamente desde la mesa principal.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={() => {
              const main = tables.find((t) => t.id === mergedSecondaryModal?.mergedIntoId);
              setMergedSecondaryModal(null);
              if (main) handleTableClick(main);
            }}
            sx={{ fontWeight: 'bold' }}
          >
            Ir a la Mesa {mergedSecondaryModal?.mergedInto?.number} (Principal)
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LinkOffIcon />}
            onClick={async () => {
              if (mergedSecondaryModal) {
                await unmergeTable(mergedSecondaryModal.id);
                setMergedSecondaryModal(null);
              }
            }}
          >
            Desunir esta Mesa
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: UNIR MESAS                                        */}
      {/* ======================================================== */}
      {mergeModalOpen && tableForMerge && (
        <MergeTablesDialog
          open={mergeModalOpen}
          onClose={() => {
            setMergeModalOpen(false);
            setTableForMerge(null);
          }}
          table={tableForMerge}
          onMergedSuccess={() => {
            fetchTables();
            if (activeTable && tableForMerge.id === activeTable.id) {
              setOccupiedModalOpen(false);
            }
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: DETALLES DE RESERVA ACTIVA                        */}
      {/* ======================================================== */}
      {reservedTableModal && (
        <ReservationDetailsDialog
          open={Boolean(reservedTableModal)}
          onClose={() => setReservedTableModal(null)}
          table={reservedTableModal}
          onSeated={(seatedTable) => {
            setReservedTableModal(null);
            setSelectedTable(seatedTable);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR NUEVA RESERVA                               */}
      {/* ======================================================== */}
      {createReservationOpen && (
        <CreateReservationDialog
          open={createReservationOpen}
          onClose={() => setCreateReservationOpen(false)}
          onSuccess={() => fetchTables()}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: PRE-CUENTA TÉRMICA (80mm)                         */}
      {/* ======================================================== */}
      {preBillModalOpen && activeTable && (
        <ThermalReceiptModal
          open={preBillModalOpen}
          onClose={() => setPreBillModalOpen(false)}
          type="PRE_BILL"
          data={{
            tableNumber: activeTable.number,
            mergedTables: activeMergedTables.map((m: any) => m.number),
            waiterName: user?.name || 'Mesero',
            items: allItems.map((it: any) => ({
              name: it.product?.name || 'Plato',
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice || 0),
              subtotal: Number(it.subtotal || 0),
              modifiers: it.modifiers,
            })),
            subtotal: tableSubtotal,
            tipAmount: Math.round(tableSubtotal * 0.1),
            total: tableSubtotal + Math.round(tableSubtotal * 0.1),
          }}
        />
      )}

      {/* Notificación flotante de plato listo */}
      <Snackbar
        open={Boolean(readyNotification)}
        autoHideDuration={8000}
        onClose={() => setReadyNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<NotificationsActiveIcon fontSize="inherit" />}
          sx={{ width: '100%', fontSize: '1.1rem', fontWeight: 'bold' }}
          onClose={() => setReadyNotification(null)}
        >
          {readyNotification?.message || `¡Comanda #${readyNotification?.orderNumber} lista para servir en Mesa ${readyNotification?.tableNumber}!`}
        </Alert>
      </Snackbar>

      {/* Modal de Transparencia de Propinas */}
      <Dialog open={tipsModalOpen} onClose={() => setTipsModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">💰 Mis Propinas y Ventas de Hoy</DialogTitle>
        <DialogContent dividers>
          {tipsData && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Comandas Cerradas:</Typography>
                <Typography fontWeight="bold">{tipsData.ordersCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">Ventas Totales Atendidas:</Typography>
                <Typography fontWeight="bold">${Number(tipsData.totalSales).toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Propina Acumulada:</Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  ${Number(tipsData.totalTips).toLocaleString()}
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Historial de Comandas Liquidadas:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {tipsData.orders.map((ord: any, idx: number) => (
                  <ListItem key={idx} sx={{ px: 0 }}>
                    <ListItemText
                      primary={`Comanda #${ord.orderNumber} (Mesa ${ord.table.number})`}
                      secondary={`Venta: $${Number(ord.subtotal).toLocaleString()} | Propina: $${Number(ord.tipAmount).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTipsModalOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Anulación de Platillo con Justificación */}
      <CancelItemDialog
        open={Boolean(itemToCancel)}
        item={itemToCancel}
        onClose={() => setItemToCancel(null)}
        onSuccess={handleCancelSuccess}
      />
    </Box>
  );
};
