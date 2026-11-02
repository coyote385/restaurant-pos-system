import { create } from 'zustand';

export interface CartModifier {
  optionId?: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  notes: string;
  modifiers: CartModifier[];
}

interface CartState {
  items: CartItem[];
  addItem: (
    product: { id: string; name: string; price: number },
    modifiers?: CartModifier[],
    notes?: string
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, modifiers = [], notes = '') => {
    const modSum = modifiers.reduce((acc, m) => acc + Number(m.price || 0), 0);
    const unitPrice = Number(product.price) + modSum;

    // Comparar si ya existe exactamente el mismo producto con los mismos modificadores y notas
    const modKey = (mods: CartModifier[]) =>
      mods.map((m) => `${m.optionId || m.name}:${m.price}`).sort().join('|');

    const targetKey = modKey(modifiers);
    const existing = get().items.find(
      (i) => i.productId === product.id && modKey(i.modifiers) === targetKey && i.notes === notes
    );

    if (existing) {
      set({
        items: get().items.map((i) =>
          i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      const cartItemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      set({
        items: [
          ...get().items,
          {
            cartItemId,
            productId: product.id,
            name: product.name,
            basePrice: Number(product.price),
            unitPrice,
            quantity: 1,
            notes,
            modifiers,
          },
        ],
      });
    }
  },

  removeItem: (cartItemId) =>
    set({ items: get().items.filter((i) => i.cartItemId !== cartItemId) }),

  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
    } else {
      set({
        items: get().items.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity } : i
        ),
      });
    }
  },

  updateItemNotes: (cartItemId, notes) =>
    set({
      items: get().items.map((i) =>
        i.cartItemId === cartItemId ? { ...i, notes } : i
      ),
    }),

  clearCart: () => set({ items: [] }),

  getSubtotal: () =>
    get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
}));
