export const Role = {
  ADMIN: 'ADMIN',
  WAITER: 'WAITER',
  KITCHEN: 'KITCHEN',
  CASHIER: 'CASHIER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TableStatus = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  WAITING_BILL: 'WAITING_BILL',
  RESERVED: 'RESERVED',
  MERGED: 'MERGED',
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const OrderStatus = {
  RECEIVED: 'RECEIVED',
  IN_PREPARATION: 'IN_PREPARATION',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ReservationStatus = {
  CONFIRMED: 'CONFIRMED',
  SEATED: 'SEATED',
  CANCELLED: 'CANCELLED',
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];
