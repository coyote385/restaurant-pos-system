import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Typography, Paper, AppBar, Toolbar, IconButton, Tabs, Tab, Badge, Chip
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useKitchenStore, StationType } from '../../stores/useKitchenStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { OrderTicketCard } from './OrderTicketCard';

export const KitchenKanbanView: React.FC = () => {
  const {
    orders,
    selectedStation,
    setSelectedStation,
    fetchActiveOrders,
    updateOrderStatus,
    listenToKitchenEvents,
  } = useKitchenStore();
  const { logout } = useAuthStore();

  useEffect(() => {
    fetchActiveOrders();
    listenToKitchenEvents();
  }, [fetchActiveOrders, listenToKitchenEvents]);

  // Filtrar órdenes que tengan al menos 1 ítem correspondiente a la estación activa
  const stationFilteredOrders = orders.filter((order) => {
    if (selectedStation === 'ALL') return true;
    return order.items.some((it) => {
      const itemStation = it.station || it.product.station || 'KITCHEN';
      return itemStation === selectedStation;
    });
  });

  const receivedOrders = stationFilteredOrders.filter((o) => o.status === 'RECEIVED');
  const inPrepOrders = stationFilteredOrders.filter((o) => o.status === 'IN_PREPARATION');
  const readyOrders = stationFilteredOrders.filter((o) => o.status === 'READY');

  // Conteo por estación para badges
  const barOrdersCount = orders.filter((o) =>
    o.items.some((it) => (it.station || it.product.station || 'KITCHEN') === 'BAR')
  ).length;

  const kitchenOrdersCount = orders.filter((o) =>
    o.items.some((it) => (it.station || it.product.station || 'KITCHEN') === 'KITCHEN')
  ).length;

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#eceff1' }}>
      {/* AppBar principal */}
      <AppBar position="static" color="default" sx={{ bgcolor: '#263238', color: 'white' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            🍳 Pantalla KDS Multi-Estación
          </Typography>

          <IconButton color="inherit" onClick={fetchActiveOrders} sx={{ mr: 1 }} title="Refrescar">
            <RefreshIcon />
          </IconButton>

          <IconButton color="inherit" onClick={logout} title="Cerrar sesión">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Selector de Estación (KDS Selector) */}
      <Box sx={{ bgcolor: '#ffffff', px: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <Tabs
          value={selectedStation}
          onChange={(_, val: StationType) => setSelectedStation(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            value="ALL"
            label="Todas las Estaciones"
            icon={<AllInboxIcon />}
            iconPosition="start"
            sx={{ fontWeight: 'bold' }}
          />
          <Tab
            value="KITCHEN"
            label={
              <Badge badgeContent={kitchenOrdersCount} color="warning" sx={{ pr: 1 }}>
                <span>Cocina Principal</span>
              </Badge>
            }
            icon={<RestaurantIcon />}
            iconPosition="start"
            sx={{ fontWeight: 'bold' }}
          />
          <Tab
            value="BAR"
            label={
              <Badge badgeContent={barOrdersCount} color="secondary" sx={{ pr: 1 }}>
                <span>Barra / Barman</span>
              </Badge>
            }
            icon={<LocalBarIcon />}
            iconPosition="start"
            sx={{ fontWeight: 'bold' }}
          />
        </Tabs>
      </Box>

      {/* Tablero Kanban */}
      <Box sx={{ p: 2, flexGrow: 1, overflowX: 'auto' }}>
        <Grid container spacing={2} sx={{ minWidth: 900, height: '100%' }}>
          {/* Columna 1: Recibidos */}
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 2,
                bgcolor: '#f5f5f5',
                height: '100%',
                overflowY: 'auto',
                borderRadius: 3,
                borderTop: '5px solid #757575',
              }}
            >
              <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ mb: 2 }}>
                📥 Recibidos ({receivedOrders.length})
              </Typography>
              {receivedOrders.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                  No hay pedidos pendientes
                </Typography>
              ) : (
                receivedOrders.map((order) => (
                  <OrderTicketCard
                    key={order.id}
                    order={order}
                    currentStation={selectedStation}
                    onAdvanceStatus={updateOrderStatus}
                  />
                ))
              )}
            </Paper>
          </Grid>

          {/* Columna 2: En Preparación */}
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 2,
                bgcolor: '#fff8e1',
                height: '100%',
                overflowY: 'auto',
                borderRadius: 3,
                borderTop: '5px solid #ed6c02',
              }}
            >
              <Typography variant="h6" fontWeight="bold" color="warning.main" sx={{ mb: 2 }}>
                🔥 En Preparación ({inPrepOrders.length})
              </Typography>
              {inPrepOrders.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                  Sin órdenes en marcha
                </Typography>
              ) : (
                inPrepOrders.map((order) => (
                  <OrderTicketCard
                    key={order.id}
                    order={order}
                    currentStation={selectedStation}
                    onAdvanceStatus={updateOrderStatus}
                  />
                ))
              )}
            </Paper>
          </Grid>

          {/* Columna 3: Listos para Servir */}
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 2,
                bgcolor: '#e8f5e9',
                height: '100%',
                overflowY: 'auto',
                borderRadius: 3,
                borderTop: '5px solid #2e7d32',
              }}
            >
              <Typography variant="h6" fontWeight="bold" color="success.main" sx={{ mb: 2 }}>
                🔔 Listos para Servir ({readyOrders.length})
              </Typography>
              {readyOrders.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                  Sin platos listos por despachar
                </Typography>
              ) : (
                readyOrders.map((order) => (
                  <OrderTicketCard
                    key={order.id}
                    order={order}
                    currentStation={selectedStation}
                    onAdvanceStatus={updateOrderStatus}
                  />
                ))
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
