import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Switch, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Grid, Card, CardContent, Chip,
  AppBar, Toolbar, IconButton, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BadgeIcon from '@mui/icons-material/Badge';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAuthStore } from '../../stores/useAuthStore';
import { DailySalesView } from './DailySalesView';
import { ShiftHistoryView } from './ShiftHistoryView';
import { StaffManagementView } from './StaffManagementView';
import { ReservationsManagementView } from '../reservations/ReservationsManagementView';
import { CashAuditView } from './CashAuditView';
import { WasteAuditView } from './WasteAuditView';

interface Product {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  category: { name: string };
}

interface Category {
  id: string;
  name: string;
}

interface WaiterSummary {
  id: string;
  name: string;
  documentId: string;
  ordersServed: number;
  totalSales: number;
  totalTips: number;
}

export const AdminDashboardView: React.FC = () => {
  const { logout } = useAuthStore();
  const [tabIndex, setTabIndex] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [waitersSummary, setWaitersSummary] = useState<WaiterSummary[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', categoryId: '' });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchReports();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/menu/products');
    if (res.ok) setProducts(await res.json());
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/menu/categories');
    if (res.ok) setCategories(await res.json());
  };

  const fetchReports = async () => {
    const res = await fetch('/api/reports/shift-summary', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) setWaitersSummary(await res.json());
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: !currentStatus } : p))
    );

    await fetch(`/api/menu/products/${productId}/toggle-availability`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) return;
    const res = await fetch('/api/menu/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(newProduct),
    });
    if (res.ok) {
      setOpenModal(false);
      setNewProduct({ name: '', price: '', categoryId: '' });
      fetchProducts();
    }
  };

  const totalSalesAll = waitersSummary.reduce((acc, w) => acc + w.totalSales, 0);
  const totalTipsAll = waitersSummary.reduce((acc, w) => acc + w.totalTips, 0);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6f8' }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            📊 Panel de Gerencia y Administración
          </Typography>
          <IconButton color="inherit" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 1250, margin: '0 auto' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          sx={{ mb: 3 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="📊 Ventas del Día" icon={<BarChartIcon />} iconPosition="start" />
          <Tab label="Menú y Disponibilidad" icon={<RestaurantMenuIcon />} iconPosition="start" />
          <Tab label="Propinas y Ventas por Mesero" icon={<MonetizationOnIcon />} iconPosition="start" />
          <Tab label="⏱️ Historial de Turnos" icon={<AccessTimeIcon />} iconPosition="start" />
          <Tab label="👥 Personal y Meseros" icon={<BadgeIcon />} iconPosition="start" />
          <Tab label="📅 Reservas" icon={<EventSeatIcon />} iconPosition="start" />
          <Tab label="💵 Arqueos de Caja (Corte Z)" icon={<PointOfSaleIcon />} iconPosition="start" />
          <Tab label="🗑️ Mermas y Cancelaciones" icon={<DeleteSweepIcon />} iconPosition="start" />
        </Tabs>

        {/* Tab 0: Ventas del Día */}
        {tabIndex === 0 && <DailySalesView />}

        {/* Tab 1: Menú y Disponibilidad */}
        {tabIndex === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">Catálogo de Productos</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenModal(true)}
                sx={{ borderRadius: 2 }}
              >
                Nuevo Platillo
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell><strong>Platillo</strong></TableCell>
                    <TableCell><strong>Categoría</strong></TableCell>
                    <TableCell><strong>Precio</strong></TableCell>
                    <TableCell align="center"><strong>Disponible en Móviles</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((prod) => (
                    <TableRow key={prod.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{prod.name}</TableCell>
                      <TableCell>
                        <Chip label={prod.category?.name || 'General'} size="small" />
                      </TableCell>
                      <TableCell>${Number(prod.price).toLocaleString()}</TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={prod.isAvailable}
                          color="success"
                          onChange={() => handleToggleStock(prod.id, prod.isAvailable)}
                        />
                        <Typography variant="caption" display="block" color={prod.isAvailable ? 'success.main' : 'error.main'}>
                          {prod.isAvailable ? 'En Carta' : 'Agotado'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Propinas y Ventas por Mesero */}
        {tabIndex === 2 && (
          <Box>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: '#e8f5e9', borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Ventas Totales Hoy</Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.dark">
                      ${totalSalesAll.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: '#fff3e0', borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Total Propinas Recaudadas</Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.dark">
                      ${totalTipsAll.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: '#e3f2fd', borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">Meseros Activos</Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.dark">
                      {waitersSummary.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell><strong>Cédula / Documento</strong></TableCell>
                    <TableCell><strong>Nombre del Mesero</strong></TableCell>
                    <TableCell align="center"><strong>Comandas Atendidas</strong></TableCell>
                    <TableCell align="right"><strong>Total Vendido</strong></TableCell>
                    <TableCell align="right"><strong>Propina Acumulada</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {waitersSummary.map((waiter) => (
                    <TableRow key={waiter.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {waiter.documentId || 'S/N'}
                      </TableCell>
                      <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                        <PeopleIcon sx={{ mr: 1, color: 'action.active' }} />
                        {waiter.name}
                      </TableCell>
                      <TableCell align="center">{waiter.ordersServed}</TableCell>
                      <TableCell align="right">${waiter.totalSales.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        ${waiter.totalTips.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 3: Historial de Turnos */}
        {tabIndex === 3 && <ShiftHistoryView />}

        {/* Tab 4: Gestión de Personal */}
        {tabIndex === 4 && <StaffManagementView />}

        {/* Tab 5: Agenda de Reservas */}
        {tabIndex === 5 && <ReservationsManagementView />}

        {/* Tab 6: Arqueos de Caja (Corte Z) */}
        {tabIndex === 6 && <CashAuditView />}

        {/* Tab 7: Auditoría de Mermas y Cancelaciones */}
        {tabIndex === 7 && <WasteAuditView />}

        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight="bold">Agregar Platillo al Menú</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="Nombre del Platillo"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <TextField
              fullWidth
              margin="dense"
              label="Precio ($)"
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="category-select-label">Categoría</InputLabel>
              <Select
                labelId="category-select-label"
                value={newProduct.categoryId}
                label="Categoría"
                onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreateProduct}>Guardar Platillo</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};
