import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, Alert, RadioGroup, FormControlLabel, Radio,
  Divider, Chip, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DeleteIcon from '@mui/icons-material/Delete';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { Table, useTableStore } from '../../stores/useTableStore';

interface Props {
  open: boolean;
  onClose: () => void;
  table: Table;
  onMergedSuccess?: () => void;
}

export const MergeTablesDialog: React.FC<Props> = ({ open, onClose, table, onMergedSuccess }) => {
  const { tables, mergeTables, unmergeTable } = useTableStore();
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mesas disponibles para unir (que estén libres y no sean la mesa actual)
  const availableTables = tables.filter(
    (t) => t.id !== table.id && t.status === 'AVAILABLE' && !t.mergedIntoId
  );

  const selectedTargetTable = tables.find((t) => t.id === selectedTargetId);
  const currentMergedTables = table.mergedTables || [];

  const handleMerge = async () => {
    if (!selectedTargetId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await mergeTables(table.id, selectedTargetId);
      if (!result.success) {
        setError(result.error || 'No se pudo unir la mesa.');
      } else {
        setSelectedTargetId('');
        onMergedSuccess?.();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnmergeSpecific = async (targetId: string) => {
    setLoading(true);
    try {
      await unmergeTable(targetId);
      onMergedSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  const handleUnmergeAll = async () => {
    setLoading(true);
    try {
      await unmergeTable(table.id);
      onMergedSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <LinkIcon color="primary" /> Unir Mesas para Grupos Grandes
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Mesa Principal:
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            Mesa {table.number} ({table.capacity} personas)
          </Typography>
        </Box>

        {/* Mesas actualmente unidas a esta */}
        {currentMergedTables.length > 0 && (
          <Box sx={{ mb: 3, p: 1.5, bgcolor: '#f3e5f5', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="secondary.dark">
                🔗 Mesas ya unidas ({currentMergedTables.length}):
              </Typography>
              <Button
                size="small"
                color="error"
                startIcon={<LinkOffIcon />}
                onClick={handleUnmergeAll}
                disabled={loading}
              >
                Desunir todas
              </Button>
            </Box>
            <List dense disablePadding>
              {currentMergedTables.map((m) => (
                <ListItem key={m.id} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    primary={<strong>Mesa {m.number}</strong>}
                    secondary={`+${m.capacity} personas de capacidad`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={() => handleUnmergeSpecific(m.id)}
                      disabled={loading}
                      title="Desunir esta mesa"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Selecciona una mesa disponible para añadir:
        </Typography>

        {availableTables.length === 0 ? (
          <Alert severity="info" sx={{ my: 1 }}>
            No hay otras mesas libres en este momento para unir.
          </Alert>
        ) : (
          <RadioGroup
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
          >
            {availableTables.map((t) => (
              <Box
                key={t.id}
                sx={{
                  border: '1px solid',
                  borderColor: selectedTargetId === t.id ? 'primary.main' : '#e0e0e0',
                  borderRadius: 2,
                  mb: 1,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: selectedTargetId === t.id ? '#e3f2fd' : 'white',
                }}
              >
                <FormControlLabel
                  value={t.id}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableRestaurantIcon fontSize="small" color="success" />
                      <Typography fontWeight="bold">Mesa {t.number}</Typography>
                      <Chip label={`${t.capacity} personas`} size="small" variant="outlined" />
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Box>
            ))}
          </RadioGroup>
        )}

        {/* Resumen de capacidad unificada */}
        {selectedTargetTable && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="success.dark" display="block">
              Capacidad Total Combinada:
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="success.dark">
              {table.capacity +
                (currentMergedTables.reduce((a, b) => a + b.capacity, 0) || 0) +
                selectedTargetTable.capacity}{' '}
              Personas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mesa {table.number} + Mesa {selectedTargetTable.number}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<LinkIcon />}
          onClick={handleMerge}
          disabled={!selectedTargetId || loading}
          sx={{ fontWeight: 'bold' }}
        >
          {loading ? 'Uniendo...' : 'Unir a esta Mesa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
