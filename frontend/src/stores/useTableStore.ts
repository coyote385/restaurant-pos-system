import { create } from 'zustand';
import { socket } from '../sockets/socket';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'WAITING_BILL' | 'RESERVED' | 'MERGED';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  posX: number;
  posY: number;
  mergedIntoId?: string | null;
  mergedInto?: { id: string; number: number } | null;
  mergedTables?: { id: string; number: number; capacity: number; status: string }[];
  orders?: any[];
  reservations?: {
    id: string;
    customerName: string;
    customerPhone?: string | null;
    guestsCount: number;
    reservationDate: string;
    notes?: string | null;
    status: string;
  }[];
}

interface TableState {
  tables: Table[];
  selectedTable: Table | null;
  editMode: boolean;
  fetchTables: () => Promise<void>;
  setSelectedTable: (table: Table | null) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  setEditMode: (val: boolean) => void;
  updateTablePosition: (tableId: string, posX: number, posY: number) => Promise<void>;
  mergeTables: (mainTableId: string, targetTableId: string) => Promise<{ success: boolean; error?: string }>;
  unmergeTable: (tableId: string) => Promise<{ success: boolean; error?: string }>;
  createTable: (data: { number?: number; capacity?: number }) => Promise<{ success: boolean; error?: string }>;
  updateTable: (id: string, data: { number?: number; capacity?: number }) => Promise<{ success: boolean; error?: string }>;
  deleteTable: (id: string) => Promise<{ success: boolean; error?: string }>;
  listenToSocketEvents: () => void;
}

export const useTableStore = create<TableState>((set, get) => ({
  tables: [],
  selectedTable: null,
  editMode: false,

  fetchTables: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/tables', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      set({ tables: data });
    }
  },

  setSelectedTable: (table) => set({ selectedTable: table }),

  updateTableStatus: (tableId, status) =>
    set((state) => ({
      tables: state.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
    })),

  setEditMode: (val) => set({ editMode: val }),

  updateTablePosition: async (tableId, posX, posY) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, posX, posY } : t
      ),
    }));
    const token = localStorage.getItem('token');
    await fetch(`/api/tables/${tableId}/position`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ posX, posY }),
    });
  },

  mergeTables: async (mainTableId, targetTableId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/tables/${mainTableId}/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetTableId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'No se pudo unir la mesa.' };
      }
      await get().fetchTables();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  unmergeTable: async (tableId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/tables/${tableId}/unmerge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'No se pudo desunir la mesa.' };
      }
      await get().fetchTables();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  createTable: async (data) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Error al crear la mesa.' };
      }
      await get().fetchTables();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  updateTable: async (id, data) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Error al actualizar la mesa.' };
      }
      await get().fetchTables();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  deleteTable: async (id) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Error al eliminar la mesa.' };
      }
      await get().fetchTables();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  listenToSocketEvents: () => {
    socket.emit('join:room', 'room:waiters');

    socket.off('table:status_changed');
    socket.on('table:status_changed', ({ tableId, status }) => {
      set((state) => ({
        tables: state.tables.map((t) => (t.id === tableId ? { ...t, status } : t)),
      }));
    });

    socket.off('tables:updated');
    socket.on('tables:updated', () => {
      get().fetchTables();
    });
  },
}));
