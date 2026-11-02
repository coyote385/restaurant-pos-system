import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Drawer, IconButton, Badge,
  List, ListItem, ListItemText, Divider, Tabs, Tab, Grid, Card, CardActionArea, Alert, Chip, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SendIcon from '@mui/icons-material/Send';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import TuneIcon from '@mui/icons-material/Tune';
import { useCartStore, CartModifier } from '../../stores/useCartStore';
import { Table } from '../../stores/useTableStore';
import { ProductModifierDialog, ProductWithModifiers } from './ProductModifierDialog';

interface Category {
  id: string;
  name: string;
}

interface Props {
  table: Table;
  onBackToMap: () => void;
  onOpenMergeModal?: () => void;
}

export const OrderCartView: React.FC<Props> = ({ table, onBackToMap, onOpenMergeModal }) => {
  const { items, addItem, updateQuantity, updateItemNotes, getSubtotal, clearCart } = useCartStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithModifiers[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('');
  
  const [selectedProductForMod, setSelectedProductForMod] = useState<ProductWithModifiers | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cargar menú
    fetch('/api/menu/categories')
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        if (data.length > 0) setSelectedCat(data[0].id);
      });

    fetch('/api/menu/products')
      .then((r) => r.json())
      .then((data: any[]) => setProducts(data));
  }, []);

  const filteredProducts = products.filter(
    (p: any) => p.categoryId === selectedCat && p.isAvailable !== false
  );

  const handleProductClick = (prod: ProductWithModifiers) => {
    if (prod.modifierGroups && prod.modifierGroups.length > 0) {
      setSelectedProductForMod(prod);
    } else {
      addItem(prod);
    }
  };

  const handleConfirmModifiers = (
    prod: { id: string; name: string; price: number },
    modifiers: CartModifier[],
    notes: string
  ) => {
    addItem(prod, modifiers, notes);
  };

  const handleSendOrder = async () => {
    if (items.length === 0) return;
    setSending(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableId: table.id,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            notes: i.notes || undefined,
            modifiers: i.modifiers,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar comanda.');
      }

      clearCart();
      setDrawerOpen(false);
      onBackToMap();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ pb: 14 }}>
      {/* Header móvil */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center' }}>
        <IconButton color="inherit" onClick={onBackToMap} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            Mesa {table.number}
            {table.mergedTables && table.mergedTables.length > 0 && (
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {' '}+ {table.mergedTables.map((m) => `Mesa ${m.number}`).join(', ')}
              </span>
            )}
          </Typography>
          <Typography variant="caption">
            Capacidad:{' '}
            {table.capacity +
              (table.mergedTables?.reduce((a, b) => a + b.capacity, 0) || 0)}{' '}
            personas • Selecciona los platillos
          </Typography>
        </Box>
        {onOpenMergeModal && (
          <Button
            color="inherit"
            size="small"
            startIcon={<LinkIcon />}
            onClick={onOpenMergeModal}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, textTransform: 'none' }}
          >
            Unir Mesas
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

      {/* Tabs horizontales de categorías */}
      {categories.length > 0 && (
        <Tabs
          value={selectedCat}
          onChange={(_, val) => setSelectedCat(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white' }}
        >
          {categories.map((c) => (
            <Tab key={c.id} label={c.name} value={c.id} sx={{ fontWeight: 'bold' }} />
          ))}
        </Tabs>
      )}

      {/* Grid táctil de productos */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {filteredProducts.map((prod) => {
            const hasMods = Boolean(prod.modifierGroups && prod.modifierGroups.length > 0);

            return (
              <Grid item xs={6} sm={4} key={prod.id}>
                <Card sx={{ borderRadius: 3, boxShadow: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardActionArea
                    onClick={() => handleProductClick(prod)}
                    sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <Box>
                      {hasMods && (
                        <Chip
                          icon={<TuneIcon fontSize="small" />}
                          label="Opciones"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 1, fontSize: '11px', fontWeight: 'bold' }}
                        />
                      )}
                      <Typography variant="body1" fontWeight="bold">
                        {prod.name}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 1 }}>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                        ${Number(prod.price).toLocaleString()}
                      </Typography>
                      <Button
                        size="small"
                        variant={hasMods ? 'contained' : 'outlined'}
                        color={hasMods ? 'secondary' : 'primary'}
                        startIcon={hasMods ? <TuneIcon /> : <AddIcon />}
                        sx={{ mt: 1, borderRadius: 2, fontWeight: 'bold' }}
                      >
                        {hasMods ? 'Personalizar' : 'Agregar'}
                      </Button>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Modal de Personalización / Modificadores */}
      <ProductModifierDialog
        open={Boolean(selectedProductForMod)}
        product={selectedProductForMod}
        onClose={() => setSelectedProductForMod(null)}
        onConfirm={handleConfirmModifiers}
      />

      {/* Botón flotante inferior para ver comanda */}
      <Box sx={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 1000 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          color="secondary"
          startIcon={
            <Badge badgeContent={items.length} color="error">
              <ShoppingCartIcon />
            </Badge>
          }
          onClick={() => setDrawerOpen(true)}
          disabled={items.length === 0}
          sx={{ py: 1.8, borderRadius: 4, fontSize: '1.1rem', fontWeight: 'bold', boxShadow: 6 }}
        >
          Ver Comanda (${getSubtotal().toLocaleString()})
        </Button>
      </Box>

      {/* Drawer deslizable con notas de cocina y confirmación */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, p: 2, maxHeight: '80vh' } }}
      >
        <Typography variant="h6" fontWeight="bold">Comanda para Mesa {table.number}</Typography>
        <Divider sx={{ my: 1 }} />

        <List sx={{ overflowY: 'auto', maxHeight: '45vh' }}>
          {items.map((item) => (
            <ListItem key={item.cartItemId} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.2 }}>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flexGrow: 1, pr: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${item.unitPrice.toLocaleString()} c/u — Subtotal: ${(item.unitPrice * item.quantity).toLocaleString()}
                  </Typography>

                  {/* Modificadores seleccionados */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {item.modifiers.map((mod, idx) => (
                        <Chip
                          key={idx}
                          label={`${mod.name}${mod.price > 0 ? ` (+$${mod.price.toLocaleString()})` : ''}`}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ fontSize: '11px' }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton size="small" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>
                    <RemoveIcon />
                  </IconButton>
                  <Typography sx={{ mx: 1, fontWeight: 'bold' }}>{item.quantity}</Typography>
                  <IconButton size="small" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>

              <TextField
                fullWidth
                size="small"
                placeholder="Notas de cocina (ej. Sin cebolla, término medio)..."
                value={item.notes}
                onChange={(e) => updateItemNotes(item.cartItemId, e.target.value)}
                InputProps={{ startAdornment: <EditNoteIcon color="action" sx={{ mr: 1 }} /> }}
                sx={{ mt: 1, bgcolor: '#f5f5f5', borderRadius: 2 }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">
            ${getSubtotal().toLocaleString()}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          color="success"
          size="large"
          endIcon={<SendIcon />}
          onClick={handleSendOrder}
          disabled={sending || items.length === 0}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
        >
          {sending ? 'Enviando a Cocina...' : 'Confirmar y Enviar Comanda'}
        </Button>
      </Drawer>
    </Box>
  );
};
