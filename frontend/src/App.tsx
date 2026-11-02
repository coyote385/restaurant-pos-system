import React, { useState } from 'react';
import { Box, ButtonGroup, Button, createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { useAuthStore } from './stores/useAuthStore';
import { LoginView } from './views/auth/LoginView';
import { WaiterView } from './views/waiter/WaiterView';
import { KitchenKanbanView } from './views/kitchen/KitchenKanbanView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { CashierView } from './views/cashier/CashierView';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff6f00',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export const App: React.FC = () => {
  const { user } = useAuthStore();
  const [adminActiveView, setAdminActiveView] = useState<'admin' | 'waiter' | 'kitchen' | 'cashier'>('admin');

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginView />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Si es ADMIN, tiene un conmutador rápido para supervisar las 4 vistas del restaurante */}
      {user.role === 'ADMIN' && (
        <Box sx={{ bgcolor: '#37474f', p: 1, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
          <ButtonGroup variant="contained" size="small">
            <Button
              color={adminActiveView === 'admin' ? 'secondary' : 'inherit'}
              onClick={() => setAdminActiveView('admin')}
            >
              📊 Administración & Reportes
            </Button>
            <Button
              color={adminActiveView === 'cashier' ? 'secondary' : 'inherit'}
              onClick={() => setAdminActiveView('cashier')}
            >
              💵 Vista de Caja (Cobros)
            </Button>
            <Button
              color={adminActiveView === 'waiter' ? 'secondary' : 'inherit'}
              onClick={() => setAdminActiveView('waiter')}
            >
              🍽️ Vista Mesero (Simulador)
            </Button>
            <Button
              color={adminActiveView === 'kitchen' ? 'secondary' : 'inherit'}
              onClick={() => setAdminActiveView('kitchen')}
            >
              🍳 Vista Cocina (KDS)
            </Button>
          </ButtonGroup>
        </Box>
      )}

      {/* Renderizado de vista según rol */}
      {user.role === 'ADMIN' ? (
        <>
          {adminActiveView === 'admin' && <AdminDashboardView />}
          {adminActiveView === 'cashier' && <CashierView />}
          {adminActiveView === 'waiter' && <WaiterView />}
          {adminActiveView === 'kitchen' && <KitchenKanbanView />}
        </>
      ) : user.role === 'CASHIER' ? (
        <CashierView />
      ) : user.role === 'KITCHEN' ? (
        <KitchenKanbanView />
      ) : (
        <WaiterView />
      )}
    </ThemeProvider>
  );
};

export default App;
