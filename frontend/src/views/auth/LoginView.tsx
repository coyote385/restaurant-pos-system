import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Tabs, Tab, Alert, CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuthStore } from '../../stores/useAuthStore';

export const LoginView: React.FC = () => {
  const { setUser } = useAuthStore();
  const [tab, setTab] = useState(0); // 0 = Mesero (PIN), 1 = Admin (Email)
  
  // Mesero state
  const [pin, setPin] = useState('');
  const [documentId, setDocumentId] = useState('');
  
  // Admin state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPin('');
    } else if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((prev) => prev + val);
    }
  };

  const handleWaiterLogin = async () => {
    if (!pin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/waiter-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, documentId: documentId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      setUser(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      setUser(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: '#f0f2f5' }}>
      <Paper sx={{ width: '100%', maxWidth: 420, p: 3, borderRadius: 4, boxShadow: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <RestaurantIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">Sistema de Pedidos</Typography>
          <Typography variant="body2" color="text.secondary">Restaurante en Tiempo Real</Typography>
        </Box>

        <Tabs value={tab} onChange={(_, val) => { setTab(val); setError(null); }} variant="fullWidth" sx={{ mb: 3 }}>
          <Tab icon={<LockIcon />} iconPosition="start" label="Personal (PIN)" />
          <Tab icon={<AdminPanelSettingsIcon />} iconPosition="start" label="Admin" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 0 ? (
          <Box>
            <TextField
              fullWidth
              size="small"
              label="Cédula (Opcional si tu PIN es único)"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* Display del PIN */}
            <Box
              sx={{
                bgcolor: '#e8ecef',
                p: 2,
                borderRadius: 2,
                textAlign: 'center',
                letterSpacing: 10,
                fontSize: 32,
                fontWeight: 'bold',
                mb: 2,
                minHeight: 40,
              }}
            >
              {pin ? '•'.repeat(pin.length) : <Typography color="text.secondary" sx={{ letterSpacing: 0 }}>Digita tu PIN</Typography>}
            </Box>

            {/* Teclado numérico táctil */}
            <Grid container spacing={1.5}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((k) => (
                <Grid item xs={4} key={k}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleKeypadPress(k)}
                    sx={{
                      height: 56,
                      fontSize: '1.4rem',
                      fontWeight: 'bold',
                      borderRadius: 3,
                      bgcolor: k === 'C' || k === 'DEL' ? '#ffebee' : '#ffffff',
                      color: k === 'C' || k === 'DEL' ? 'error.main' : 'text.primary',
                    }}
                  >
                    {k}
                  </Button>
                </Grid>
              ))}
            </Grid>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleWaiterLogin}
              disabled={loading || pin.length < 4}
              sx={{ mt: 3, py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
            >
              {loading ? <CircularProgress size={26} color="inherit" /> : 'Ingresar'}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleAdminLogin}>
            <TextField
              fullWidth
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
            >
              {loading ? <CircularProgress size={26} color="inherit" /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
