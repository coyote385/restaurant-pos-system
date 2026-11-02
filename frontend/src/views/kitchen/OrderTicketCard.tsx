import React from 'react';
import {
  Card, CardContent, Typography, Box, Divider, Button, Chip, IconButton, Tooltip
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { KitchenOrder, OrderStatus, StationType, useKitchenStore } from '../../stores/useKitchenStore';
import { CancelItemDialog } from '../../components/CancelItemDialog';

interface Props {
  order: KitchenOrder;
  currentStation: StationType;
  onAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export const OrderTicketCard: React.FC<Props> = ({ order, currentStation, onAdvanceStatus }) => {
  const { updateItemStatus, fetchActiveOrders } = useKitchenStore();
  const [itemToCancel, setItemToCancel] = React.useState<any>(null);

  const minutesAgo = Math.floor(
    (new Date().getTime() - new Date(order.createdAt).getTime()) / 60000
  );

  // Filtrar ítems según la estación activa si no es ALL
  const displayItems = order.items.filter((it) => {
    if (currentStation === 'ALL') return true;
    const itemStation = it.station || it.product.station || 'KITCHEN';
    return itemStation === currentStation;
  });

  if (displayItems.length === 0) return null;

  const handleAdvanceItem = (itemId: string, currentStatus?: string) => {
    let next = 'IN_PREPARATION';
    if (currentStatus === 'IN_PREPARATION') next = 'READY';
    else if (currentStatus === 'READY') next = 'DELIVERED';
    updateItemStatus(order.id, itemId, next);
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        boxShadow: 3,
        borderLeft:
          order.status === 'READY'
            ? '8px solid #2e7d32'
            : order.status === 'IN_PREPARATION'
            ? '8px solid #ed6c02'
            : '8px solid #757575',
        bgcolor: '#ffffff',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Encabezado del ticket */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            #{order.orderNumber} — Mesa {order.table.number}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: minutesAgo > 20 ? 'error.main' : minutesAgo > 10 ? 'warning.main' : 'text.secondary',
            }}
          >
            <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="body2" fontWeight="bold">{minutesAgo}m</Typography>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Mesero: {order.user.name}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        {/* Lista de ítems con control independiente por estación */}
        {displayItems.map((item) => {
          const itemStation = item.station || item.product.station || 'KITCHEN';
          const isBar = itemStation === 'BAR';
          const itemStatus = item.status || order.status;

          return (
            <Box
              key={item.id}
              sx={{
                mb: 1.5,
                p: 1.2,
                borderRadius: 2,
                bgcolor:
                  itemStatus === 'READY'
                    ? '#e8f5e9'
                    : itemStatus === 'IN_PREPARATION'
                    ? '#fff8e1'
                    : '#fafafa',
                border: '1px solid',
                borderColor:
                  itemStatus === 'READY'
                    ? '#c8e6c9'
                    : itemStatus === 'IN_PREPARATION'
                    ? '#ffe082'
                    : '#eeeeee',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flexGrow: 1, pr: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {item.quantity}x {item.product.name}
                    </Typography>

                    {/* Chip de estación */}
                    <Chip
                      icon={isBar ? <LocalBarIcon fontSize="small" /> : <RestaurantIcon fontSize="small" />}
                      label={isBar ? 'Barra' : 'Cocina'}
                      size="small"
                      color={isBar ? 'secondary' : 'default'}
                      sx={{ fontSize: '10px', height: 20 }}
                    />

                    {/* Chip de estado del plato */}
                    <Chip
                      label={
                        itemStatus === 'READY'
                          ? 'Listo ✓'
                          : itemStatus === 'IN_PREPARATION'
                          ? 'En marcha'
                          : 'Pendiente'
                      }
                      size="small"
                      color={
                        itemStatus === 'READY'
                          ? 'success'
                          : itemStatus === 'IN_PREPARATION'
                          ? 'warning'
                          : 'default'
                      }
                      sx={{ fontSize: '10px', height: 20, fontWeight: 'bold' }}
                    />
                  </Box>

                  {/* Modificadores */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {item.modifiers.map((mod, mIdx) => (
                        <Chip
                          key={mIdx}
                          label={`• ${mod.name}`}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ fontSize: '10px', height: 20 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Nota */}
                  {item.notes && (
                    <Chip
                      label={item.notes}
                      size="small"
                      color="warning"
                      sx={{ mt: 0.5, fontWeight: 'bold', fontSize: '11px', height: 20 }}
                    />
                  )}
                </Box>

                {/* Botón de avance individual del plato y reporte de merma */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {itemStatus === 'READY' ? (
                    <Tooltip title="Plato marcado como listo">
                      <IconButton size="small" color="success">
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  ) : itemStatus === 'IN_PREPARATION' ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleAdvanceItem(item.id, itemStatus)}
                      sx={{ fontSize: '11px', py: 0.4, px: 1, textTransform: 'none', fontWeight: 'bold' }}
                    >
                      Listo ✓
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => handleAdvanceItem(item.id, itemStatus)}
                      sx={{ fontSize: '11px', py: 0.4, px: 1, textTransform: 'none' }}
                    >
                      Marchar
                    </Button>
                  )}

                  <Tooltip title="Reportar plato quemado / defectuoso / merma">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                        setItemToCancel({
                          id: item.id,
                          productName: item.product.name,
                          quantity: item.quantity,
                          subtotal: 0,
                          status: itemStatus,
                        })
                      }
                      sx={{ p: 0.4 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          );
        })}

        {order.notes && (
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
            Nota general: {order.notes}
          </Typography>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Botones de acción masiva de la comanda */}
        {order.status === 'RECEIVED' && (
          <Button
            fullWidth
            variant="contained"
            color="warning"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={() => onAdvanceStatus(order.id, 'IN_PREPARATION')}
            sx={{ py: 1, fontWeight: 'bold', borderRadius: 2 }}
          >
            Marchar Todo
          </Button>
        )}

        {order.status === 'IN_PREPARATION' && (
          <Button
            fullWidth
            variant="contained"
            color="success"
            size="large"
            startIcon={<CheckCircleIcon />}
            onClick={() => onAdvanceStatus(order.id, 'READY')}
            sx={{ py: 1, fontWeight: 'bold', borderRadius: 2 }}
          >
            Marcar Todo Listo
          </Button>
        )}

        {order.status === 'READY' && (
          <Button
            fullWidth
            variant="outlined"
            color="success"
            size="large"
            startIcon={<DoneAllIcon />}
            onClick={() => onAdvanceStatus(order.id, 'DELIVERED')}
            sx={{ py: 1, fontWeight: 'bold', borderRadius: 2 }}
          >
            Despachar / Entregado
          </Button>
        )}
      </CardContent>

      {/* Modal de Anulación de Plato por Cocina / Merma */}
      <CancelItemDialog
        open={Boolean(itemToCancel)}
        item={itemToCancel}
        onClose={() => setItemToCancel(null)}
        onSuccess={() => fetchActiveOrders()}
      />
    </Card>
  );
};
