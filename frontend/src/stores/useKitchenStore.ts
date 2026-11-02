import { create } from 'zustand';
import { socket } from '../sockets/socket';

export type OrderStatus = 'RECEIVED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED';
export type StationType = 'ALL' | 'KITCHEN' | 'BAR';

export interface KitchenItem {
  id: string;
  quantity: number;
  station?: string;
  status?: string;
  notes?: string | null;
  product: { name: string; station?: string };
  modifiers?: { id?: string; name: string; price: number }[];
}

export interface KitchenOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string | null;
  table: { number: number };
  user: { name: string };
  items: KitchenItem[];
}

interface KitchenState {
  orders: KitchenOrder[];
  selectedStation: StationType;
  setSelectedStation: (station: StationType) => void;
  fetchActiveOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  updateItemStatus: (orderId: string, itemId: string, nextStatus: string) => Promise<void>;
  listenToKitchenEvents: () => void;
}

const playKitchenBell = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  } catch (e) {
    console.warn('Audio no permitido antes de la primera interacción.');
  }
};

export const useKitchenStore = create<KitchenState>((set, get) => ({
  orders: [],
  selectedStation: 'ALL',

  setSelectedStation: (station) => set({ selectedStation: station }),

  fetchActiveOrders: async () => {
    const res = await fetch('/api/orders/kitchen', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) {
      const data = await res.json();
      set({ orders: data });
    }
  },

  updateOrderStatus: async (orderId, nextStatus) => {
    set({
      orders: get().orders
        .map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: nextStatus,
                items: o.items.map((it) => ({ ...it, status: nextStatus })),
              }
            : o
        )
        .filter((o) => nextStatus !== 'DELIVERED'),
    });

    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
  },

  updateItemStatus: async (orderId, itemId, nextStatus) => {
    // Actualización optimista del ítem
    set({
      orders: get().orders.map((o) => {
        if (o.id !== orderId) return o;
        const newItems = o.items.map((it) => (it.id === itemId ? { ...it, status: nextStatus } : it));
        const allReady = newItems.every((it) => it.status === 'READY' || it.status === 'DELIVERED');
        const anyInPrep = newItems.some((it) => it.status === 'IN_PREPARATION');

        let newOrderStatus = o.status;
        if (allReady) newOrderStatus = 'READY';
        else if (anyInPrep && o.status === 'RECEIVED') newOrderStatus = 'IN_PREPARATION';

        return { ...o, status: newOrderStatus, items: newItems };
      }),
    });

    try {
      await fetch(`/api/orders/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      console.error('Error al actualizar estado del ítem:', e);
      get().fetchActiveOrders();
    }
  },

  listenToKitchenEvents: () => {
    socket.emit('join:room', 'room:kitchen');

    socket.off('order:created');
    socket.on('order:created', (newOrder: KitchenOrder) => {
      set({ orders: [...get().orders, newOrder] });
      playKitchenBell();
    });

    socket.off('order:status_changed');
    socket.on('order:status_changed', ({ orderId, status }) => {
      set({
        orders: get().orders
          .map((o) => (o.id === orderId ? { ...o, status } : o))
          .filter((o) => status !== 'DELIVERED'),
      });
    });

    socket.off('order:item_status_changed');
    socket.on('order:item_status_changed', ({ orderId, itemId, status }) => {
      set({
        orders: get().orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            items: o.items.map((it) => (it.id === itemId ? { ...it, status } : it)),
          };
        }),
      });
    });
  },
}));
