import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, RadioGroup, FormControlLabel, Radio,
  Checkbox, TextField, Chip, Divider, Paper, Stack, Alert
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { CartModifier } from '../../stores/useCartStore';

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: ModifierOption[];
}

export interface ProductWithModifiers {
  id: string;
  name: string;
  price: number;
  modifierGroups?: {
    group: ModifierGroup;
  }[];
}

interface Props {
  open: boolean;
  product: ProductWithModifiers | null;
  onClose: () => void;
  onConfirm: (product: { id: string; name: string; price: number }, modifiers: CartModifier[], notes: string) => void;
}

export const ProductModifierDialog: React.FC<Props> = ({
  open,
  product,
  onClose,
  onConfirm,
}) => {
  const [selectedSingle, setSelectedSingle] = useState<{ [groupId: string]: string }>({});
  const [selectedMulti, setSelectedMulti] = useState<{ [groupId: string]: string[] }>({});
  const [notes, setNotes] = useState('');

  // Reset selections when opening with a new product
  useEffect(() => {
    if (!product) return;
    const initialSingle: { [groupId: string]: string } = {};
    const initialMulti: { [groupId: string]: string[] } = {};

    product.modifierGroups?.forEach(({ group }) => {
      if (group.maxSelect === 1) {
        // Pre-select first option if required
        if (group.isRequired && group.options.length > 0) {
          initialSingle[group.id] = group.options[0].id;
        } else {
          initialSingle[group.id] = '';
        }
      } else {
        initialMulti[group.id] = [];
      }
    });

    setSelectedSingle(initialSingle);
    setSelectedMulti(initialMulti);
    setNotes('');
  }, [product, open]);

  if (!product) return null;

  const groups = product.modifierGroups?.map((mg) => mg.group) || [];

  // Handle single selection (radio)
  const handleSingleChange = (groupId: string, optionId: string) => {
    setSelectedSingle((prev) => ({ ...prev, [groupId]: optionId }));
  };

  // Handle multi selection (checkbox)
  const handleMultiToggle = (groupId: string, optionId: string, maxSelect: number) => {
    setSelectedMulti((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= maxSelect) {
        return prev; // Reached maximum limit
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  // Check validity
  const isValid = groups.every((group) => {
    if (group.isRequired || group.minSelect > 0) {
      if (group.maxSelect === 1) {
        return Boolean(selectedSingle[group.id]);
      } else {
        const count = (selectedMulti[group.id] || []).length;
        return count >= group.minSelect;
      }
    }
    return true;
  });

  // Calculate total price with modifiers
  let extraPrice = 0;
  const chosenModifiers: CartModifier[] = [];

  groups.forEach((group) => {
    if (group.maxSelect === 1) {
      const optId = selectedSingle[group.id];
      const opt = group.options.find((o) => o.id === optId);
      if (opt) {
        extraPrice += Number(opt.price || 0);
        chosenModifiers.push({ optionId: opt.id, name: opt.name, price: Number(opt.price || 0) });
      }
    } else {
      const optIds = selectedMulti[group.id] || [];
      optIds.forEach((id) => {
        const opt = group.options.find((o) => o.id === id);
        if (opt) {
          extraPrice += Number(opt.price || 0);
          chosenModifiers.push({ optionId: opt.id, name: opt.name, price: Number(opt.price || 0) });
        }
      });
    }
  });

  const finalUnitPrice = Number(product.price) + extraPrice;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(
      { id: product.id, name: product.name, price: Number(product.price) },
      chosenModifiers,
      notes.trim()
    );
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <TuneIcon color="primary" /> Personalizar {product.name}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Precio base:
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="primary">
            ${Number(product.price).toLocaleString()}
          </Typography>
        </Box>

        {groups.map((group) => {
          const isRequired = group.isRequired || group.minSelect > 0;
          const isSingle = group.maxSelect === 1;

          return (
            <Paper
              key={group.id}
              variant="outlined"
              sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#fafafa' }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {group.name}
                </Typography>
                <Chip
                  label={
                    isRequired
                      ? isSingle
                        ? 'Obligatorio (elige 1)'
                        : `Obligatorio (mínimo ${group.minSelect})`
                      : isSingle
                      ? 'Opcional (elige 1)'
                      : `Opcional (hasta ${group.maxSelect})`
                  }
                  color={isRequired ? 'warning' : 'default'}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>

              {isSingle ? (
                <RadioGroup
                  value={selectedSingle[group.id] || ''}
                  onChange={(e) => handleSingleChange(group.id, e.target.value)}
                >
                  {group.options.map((opt) => (
                    <FormControlLabel
                      key={opt.id}
                      value={opt.id}
                      control={<Radio size="small" />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{opt.name}</span>
                          {opt.price > 0 && (
                            <Chip
                              label={`+$${Number(opt.price).toLocaleString()}`}
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              ) : (
                <Stack spacing={0.5}>
                  {group.options.map((opt) => {
                    const checked = (selectedMulti[group.id] || []).includes(opt.id);
                    return (
                      <FormControlLabel
                        key={opt.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => handleMultiToggle(group.id, opt.id, group.maxSelect)}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{opt.name}</span>
                            {opt.price > 0 ? (
                              <Chip
                                label={`+$${Number(opt.price).toLocaleString()}`}
                                color="success"
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Chip label="Incluido" size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                      />
                    );
                  })}
                </Stack>
              )}
            </Paper>
          );
        })}

        {/* Campo de notas / especificación adicional */}
        <TextField
          fullWidth
          margin="dense"
          label="Nota o Instrucción de Preparación (Opcional)"
          placeholder="Ej: Sin cebolla, salsa aparte, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Total Unitario:
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="success.dark">
            ${finalUnitPrice.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddShoppingCartIcon />}
            onClick={handleConfirm}
            disabled={!isValid}
            sx={{ fontWeight: 'bold' }}
          >
            Agregar al Pedido
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
