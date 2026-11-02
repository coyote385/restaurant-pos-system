import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardActionArea, Typography, Chip, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LinkIcon from '@mui/icons-material/Link';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  DndContext,
  useDraggable,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTableStore, Table, TableStatus } from '../../stores/useTableStore';
import { CreateTableDialog } from '../admin/CreateTableDialog';
import { EditTableDialog } from '../admin/EditTableDialog';

const statusConfig: Record<TableStatus, { color: string; label: string }> = {
  AVAILABLE: { color: '#2e7d32', label: 'Disponible' },
  OCCUPIED: { color: '#d32f2f', label: 'Ocupada' },
  WAITING_BILL: { color: '#ed6c02', label: 'Por Cobrar' },
  RESERVED: { color: '#0288d1', label: 'Reservada' },
  MERGED: { color: '#8e24aa', label: 'Unida' },
};

// ────────────────────────────────────────────────
// DraggableTable — tarjeta individual arrastrable
// ────────────────────────────────────────────────
interface DraggableTableProps {
  table: Table;
  onSelectTable: (table: Table) => void;
  editMode: boolean;
  onEditTable?: (table: Table) => void;
  onDeleteTable?: (table: Table) => void;
}

const DraggableTable: React.FC<DraggableTableProps> = ({
  table,
  onSelectTable,
  editMode,
  onEditTable,
  onDeleteTable,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${table.posX}%`,
    top: `${table.posY}%`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : 1,
    opacity: isDragging ? 0.85 : 1,
    cursor: editMode ? 'grab' : 'pointer',
    width: 140,
    touchAction: 'none',
  };

  const { color, label } = statusConfig[table.status] || { color: '#999', label: table.status };
  const hasMergedChildren = (table.mergedTables || []).length > 0;
  const isMergedSecondary = table.status === 'MERGED' && table.mergedInto;
  const isReserved = table.status === 'RESERVED';
  const activeReservation = table.reservations?.[0];
  const totalCapacity =
    table.capacity + (table.mergedTables?.reduce((a, b) => a + b.capacity, 0) || 0);

  return (
    <Box ref={setNodeRef} style={style}>
      <Card
        sx={{
          borderTop: `6px solid ${color}`,
          borderRadius: 3,
          boxShadow: isDragging ? 8 : 3,
          textAlign: 'center',
          transition: isDragging ? 'none' : 'box-shadow 0.2s',
          bgcolor: isReserved ? '#e1f5fe' : isMergedSecondary ? '#f3e5f5' : isDragging ? '#f0f4ff' : 'white',
        }}
      >
        {editMode ? (
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              {...listeners}
              {...attributes}
              sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab' }}
            >
              <DragIndicatorIcon sx={{ color: 'action.active', fontSize: 20 }} />
              <TableRestaurantIcon sx={{ fontSize: 32, color }} />
              <Typography variant="h6" fontWeight="bold">
                Mesa {table.number}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {table.capacity} personas
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, zIndex: 10 }}>
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTable?.(table);
                }}
                title="Editar capacidad / número"
                sx={{ bgcolor: '#e3f2fd', p: 0.5 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTable?.(table);
                }}
                title="Eliminar mesa"
                sx={{ bgcolor: '#ffebee', p: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <CardActionArea onClick={() => onSelectTable(table)} sx={{ p: 1.5 }}>
            {isReserved ? (
              <EventSeatIcon sx={{ fontSize: 36, color }} />
            ) : (
              <TableRestaurantIcon sx={{ fontSize: 36, color }} />
            )}
            <Typography variant="h6" fontWeight="bold">
              Mesa {table.number}
            </Typography>

            {/* Si es una mesa que tiene otras unidas */}
            {hasMergedChildren && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                <LinkIcon fontSize="small" sx={{ color: '#8e24aa', fontSize: 16 }} />
                <Typography variant="caption" sx={{ color: '#8e24aa', fontWeight: 'bold' }}>
                  +{table.mergedTables?.map((m) => `M${m.number}`).join(', ')}
                </Typography>
              </Box>
            )}

            {/* Si es una mesa reservada */}
            {isReserved ? (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'info.dark', fontWeight: 'bold', display: 'block' }}>
                  {activeReservation?.customerName || 'Reserva'}
                </Typography>
                {activeReservation?.reservationDate && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {new Date(activeReservation.reservationDate).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                )}
              </Box>
            ) : isMergedSecondary ? (
              <Typography variant="caption" sx={{ color: '#8e24aa', fontWeight: 'bold', display: 'block' }}>
                🔗 Unida a Mesa {table.mergedInto?.number}
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary" display="block">
                Capacidad: {totalCapacity} pers.
              </Typography>
            )}

            <Chip
              label={isMergedSecondary ? `Unida a M-${table.mergedInto?.number}` : label}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: `${color}15`,
                color,
                fontWeight: 'bold',
                fontSize: isMergedSecondary ? '0.7rem' : undefined,
              }}
            />
          </CardActionArea>
        )}
      </Card>
    </Box>
  );
};

// ────────────────────────────────────────────────
// TableMapView principal
// ────────────────────────────────────────────────
interface Props {
  onSelectTable: (table: Table) => void;
  editMode?: boolean;
}

export const TableMapView: React.FC<Props> = ({ onSelectTable, editMode = false }) => {
  const { tables, fetchTables, listenToSocketEvents, updateTablePosition, deleteTable } = useTableStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Modales de administración de mesas
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
    listenToSocketEvents();
  }, [fetchTables, listenToSocketEvents]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      if (!containerRef.current) return;

      const table = tables.find((t) => t.id === active.id);
      if (!table) return;

      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      const deltaPctX = (delta.x / containerW) * 100;
      const deltaPctY = (delta.y / containerH) * 100;

      const newPosX = Math.min(95, Math.max(0, table.posX + deltaPctX));
      const newPosY = Math.min(90, Math.max(0, table.posY + deltaPctY));

      updateTablePosition(table.id, Math.round(newPosX * 10) / 10, Math.round(newPosY * 10) / 10);
    },
    [tables, updateTablePosition]
  );

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) return;
    setDeleteError(null);
    const result = await deleteTable(tableToDelete.id);
    if (!result.success) {
      setDeleteError(result.error || 'No se pudo eliminar la mesa.');
    } else {
      setTableToDelete(null);
    }
  };

  const hasPositions = tables.some((t) => t.posX !== 0 || t.posY !== 0);

  const getDefaultPos = (index: number, total: number) => {
    const cols = Math.ceil(Math.sqrt(total));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      posX: 2 + col * (92 / cols),
      posY: 5 + row * 30,
    };
  };

  const tablesWithPos = tables.map((t, i) => ({
    ...t,
    posX: hasPositions ? t.posX : getDefaultPos(i, tables.length).posX,
    posY: hasPositions ? t.posY : getDefaultPos(i, tables.length).posY,
  }));

  return (
    <Box sx={{ p: 2 }}>
      {editMode && (
        <Box
          sx={{
            mb: 1.5,
            p: 1.5,
            bgcolor: '#fff8e1',
            borderRadius: 2,
            border: '1px dashed #f9a825',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="body2" color="warning.dark" fontWeight="bold">
            ✏️ Modo edición activo: arrastra las mesas para reorganizarlas, edita su capacidad o añade nuevas.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ fontWeight: 'bold', borderRadius: 2 }}
          >
            Agregar Mesa
          </Button>
        </Box>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Box
          ref={containerRef}
          sx={{
            position: 'relative',
            width: '100%',
            height: 'calc(100vh - 220px)',
            minHeight: 450,
            borderRadius: 3,
            border: editMode ? '2px dashed #1976d2' : '1px solid #e0e0e0',
            bgcolor: editMode ? '#f5f9ff' : '#fafafa',
            backgroundImage: editMode
              ? 'radial-gradient(circle, #cfd8dc 1px, transparent 1px)'
              : 'none',
            backgroundSize: editMode ? '30px 30px' : 'auto',
            overflow: 'hidden',
          }}
        >
          {tablesWithPos.map((table) => (
            <DraggableTable
              key={table.id}
              table={table}
              onSelectTable={onSelectTable}
              editMode={editMode}
              onEditTable={(t) => setEditingTable(t)}
              onDeleteTable={(t) => {
                setDeleteError(null);
                setTableToDelete(t);
              }}
            />
          ))}
        </Box>
      </DndContext>

      {/* Modal Agregar Mesa */}
      {createDialogOpen && (
        <CreateTableDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
        />
      )}

      {/* Modal Editar Mesa */}
      {editingTable && (
        <EditTableDialog
          open={Boolean(editingTable)}
          onClose={() => setEditingTable(null)}
          table={editingTable}
        />
      )}

      {/* Confirmación para eliminar mesa */}
      <Dialog open={Boolean(tableToDelete)} onClose={() => setTableToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">¿Eliminar Mesa {tableToDelete?.number}?</DialogTitle>
        <DialogContent dividers>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography variant="body2">
            ¿Estás seguro de que deseas retirar la <strong>Mesa {tableToDelete?.number}</strong> del plano del restaurante?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTableToDelete(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            Eliminar Mesa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
