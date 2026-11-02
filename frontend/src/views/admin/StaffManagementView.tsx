import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Chip, IconButton, Switch, FormControl,
  InputLabel, Select, MenuItem, Alert, Snackbar, Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';

interface UserItem {
  id: string;
  name: string;
  documentId: string | null;
  email: string | null;
  role: 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER';
  isActive: boolean;
  createdAt: string;
  _count?: {
    orders: number;
    shifts: number;
  };
}

const roleConfig: Record<string, { label: string; color: 'primary' | 'success' | 'warning' | 'secondary' }> = {
  WAITER: { label: 'Mesero', color: 'primary' },
  CASHIER: { label: 'Cajero', color: 'success' },
  KITCHEN: { label: 'Cocina', color: 'warning' },
  ADMIN: { label: 'Administrador', color: 'secondary' },
};

export const StaffManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Nuevo Colaborador
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    documentId: '',
    pin: '',
    role: 'WAITER' as 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER',
    email: '',
    password: '',
  });
  const [createError, setCreateError] = useState('');

  // Modal Cambiar PIN
  const [openPinModal, setOpenPinModal] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState<UserItem | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Modal Editar Datos
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', documentId: '', role: 'WAITER' as any });
  const [editError, setEditError] = useState('');

  // Snackbar de éxito
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    setCreateError('');
    if (!formData.name.trim()) {
      setCreateError('El nombre es obligatorio.');
      return;
    }

    if (formData.role !== 'ADMIN' && (!formData.pin || !/^\d{4,6}$/.test(formData.pin))) {
      setCreateError('El PIN debe tener entre 4 y 6 dígitos numéricos.');
      return;
    }

    if (formData.role === 'ADMIN' && (!formData.email || !formData.password)) {
      setCreateError('El administrador requiere correo y contraseña.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Error al crear el colaborador.');
        return;
      }

      setSuccessMsg(`Colaborador ${data.name} registrado con éxito.`);
      setOpenCreateModal(false);
      setFormData({
        name: '',
        documentId: '',
        pin: '',
        role: 'WAITER',
        email: '',
        password: '',
      });
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Error de conexión.');
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/users/${user.id}/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'No se pudo cambiar el estado.');
        return;
      }

      setSuccessMsg(`Estado de ${user.name} actualizado.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    }
  };

  const handleUpdatePin = async () => {
    setPinError('');
    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError('El nuevo PIN debe tener entre 4 y 6 dígitos.');
      return;
    }

    if (!selectedUserForPin) return;

    try {
      const res = await fetch(`/api/users/${selectedUserForPin.id}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ pin: newPin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || 'Error al actualizar el PIN.');
        return;
      }

      setSuccessMsg(`PIN actualizado correctamente para ${selectedUserForPin.name}.`);
      setOpenPinModal(false);
      setNewPin('');
    } catch (err: any) {
      setPinError(err.message || 'Error de conexión.');
    }
  };

  const handleUpdateUserData = async () => {
    setEditError('');
    if (!editingUser) return;
    if (!editFormData.name.trim()) {
      setEditError('El nombre no puede estar vacío.');
      return;
    }

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Error al actualizar los datos.');
        return;
      }

      setSuccessMsg(`Datos de ${data.name} actualizados.`);
      setOpenEditModal(false);
      fetchUsers();
    } catch (err: any) {
      setEditError(err.message || 'Error de conexión.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            👥 Equipo de Trabajo y Colaboradores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra el personal del restaurante, registra nuevos meseros y gestiona sus credenciales de acceso.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={fetchUsers} disabled={loading} color="primary" title="Refrescar">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => {
              setCreateError('');
              setOpenCreateModal(true);
            }}
            sx={{ borderRadius: 2, fontWeight: 'bold' }}
          >
            Nuevo Colaborador
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Cédula / Documento</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell align="center"><strong>Comandas Atendidas</strong></TableCell>
              <TableCell align="center"><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay colaboradores registrados.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const roleBadge = roleConfig[u.role] || { label: u.role, color: 'primary' };
                return (
                  <TableRow key={u.id} hover sx={{ opacity: u.isActive ? 1 : 0.6 }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {u.name}
                      {u.email && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {u.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {u.documentId || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={roleBadge.label}
                        color={roleBadge.color}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {u._count?.orders ?? 0}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={u.isActive ? 'Desactivar acceso' : 'Activar acceso'}>
                        <Switch
                          checked={u.isActive}
                          color="success"
                          onChange={() => handleToggleStatus(u)}
                        />
                      </Tooltip>
                      <Typography variant="caption" display="block" color={u.isActive ? 'success.main' : 'error.main'}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {u.role !== 'ADMIN' && (
                          <Tooltip title="Cambiar PIN">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedUserForPin(u);
                                setNewPin('');
                                setPinError('');
                                setOpenPinModal(true);
                              }}
                            >
                              <VpnKeyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Editar datos">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => {
                              setEditingUser(u);
                              setEditFormData({
                                name: u.name,
                                documentId: u.documentId || '',
                                role: u.role,
                              });
                              setEditError('');
                              setOpenEditModal(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ========================================== */}
      {/* MODAL: REGISTRAR NUEVO COLABORADOR        */}
      {/* ========================================== */}
      <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">👤 Registrar Nuevo Colaborador</DialogTitle>
        <DialogContent dividers>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}

          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Nombre Completo"
            placeholder="Ej: David Pérez"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <TextField
            fullWidth
            margin="dense"
            label="Cédula / Documento de Identidad"
            placeholder="Ej: 1020304050"
            value={formData.documentId}
            onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
          />

          <FormControl fullWidth margin="dense">
            <InputLabel id="role-select-label">Rol en el Restaurante</InputLabel>
            <Select
              labelId="role-select-label"
              value={formData.role}
              label="Rol en el Restaurante"
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
            >
              <MenuItem value="WAITER">Mesero</MenuItem>
              <MenuItem value="CASHIER">Cajero</MenuItem>
              <MenuItem value="KITCHEN">Cocina</MenuItem>
              <MenuItem value="ADMIN">Administrador</MenuItem>
            </Select>
          </FormControl>

          {formData.role !== 'ADMIN' ? (
            <TextField
              fullWidth
              margin="dense"
              label="PIN de Acceso (4 a 6 dígitos)"
              type="password"
              placeholder="Ej: 1234"
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
              helperText="El PIN con el que ingresará en el teclado táctil de la aplicación."
            />
          ) : (
            <>
              <TextField
                fullWidth
                margin="dense"
                label="Correo Electrónico"
                type="email"
                placeholder="admin2@restaurante.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <TextField
                fullWidth
                margin="dense"
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCreateModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateUser} sx={{ fontWeight: 'bold' }}>
            Guardar Colaborador
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL: CAMBIAR PIN                        */}
      {/* ========================================== */}
      <Dialog open={openPinModal} onClose={() => setOpenPinModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">🔑 Cambiar PIN de Acceso</DialogTitle>
        <DialogContent dividers>
          {pinError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {pinError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Asignar nuevo PIN numérico para <strong>{selectedUserForPin?.name}</strong>:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nuevo PIN (4 a 6 dígitos)"
            type="password"
            placeholder="1234"
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            helperText="Debe ser diferente al PIN de otros colaboradores activos."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPinModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdatePin} sx={{ fontWeight: 'bold' }}>
            Guardar Nuevo PIN
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL: EDITAR DATOS                       */}
      {/* ========================================== */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">✏️ Editar Colaborador</DialogTitle>
        <DialogContent dividers>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Nombre"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Cédula / Documento"
            value={editFormData.documentId}
            onChange={(e) => setEditFormData({ ...editFormData, documentId: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-role-label">Rol</InputLabel>
            <Select
              labelId="edit-role-label"
              value={editFormData.role}
              label="Rol"
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
            >
              <MenuItem value="WAITER">Mesero</MenuItem>
              <MenuItem value="CASHIER">Cajero</MenuItem>
              <MenuItem value="KITCHEN">Cocina</MenuItem>
              <MenuItem value="ADMIN">Administrador</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdateUserData} sx={{ fontWeight: 'bold' }}>
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificación de éxito */}
      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%', fontWeight: 'bold' }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};
