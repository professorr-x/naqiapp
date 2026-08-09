export type OrderType = 'oneTime' | 'weekly' | 'monthly';

export type DeliveryTimeWindow = 'morning' | 'afternoon';

export interface Order {
  orderType: OrderType;
  bottleQuantity: number;
  deliveryDate: Date;
  deliveryTimeWindow: DeliveryTimeWindow;
  customerName?: string;
  customerArea?: string;
  customerNotes?: string;
  totalPrice: number;
  depositAmount: number;
  waterCost: number;
}

export interface PricingConfig {
  oneTimePrice: number;
  weeklyVoucherPrice: number;
  monthlyVoucherPrice: number;
  bottleDeposit: number;
}

export interface DeliverySchedule {
  date: Date;
  timeWindow: DeliveryTimeWindow;
  available: boolean;
}
