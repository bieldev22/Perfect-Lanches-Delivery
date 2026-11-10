export type Category = "burgers" | "fries" | "drinks" | "sweets";
export interface Product {
  id: string;
  name: string;
  description: string;
  category: Category;
  ingredients: string[];
  price: number;
  image: string;
  video: string;
  badge: string;
  featured: boolean;
  active: boolean;
  allergens: string;
}
export interface CartItem {
  id: string;
  quantity: number;
  note: string;
}
export interface Customer {
  name: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  region: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  profile: Partial<Customer>;
}
export interface Store {
  name: string;
  tagline: string;
  isOpen: boolean;
  deliveryMinutes: string;
  minimumOrder: number;
  hours: string;
  pickupAddress: string;
  regions: { name: string; fee: number }[];
}
export type OrderStatus =
  | "awaiting_payment"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export interface Order {
  id: string;
  number: string;
  createdAt: number;
  demo: boolean;
  status: OrderStatus;
  paymentStatus: string;
  paymentMode: string;
  items: (CartItem & { name: string; price: number; image: string })[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: Customer;
  note: string;
  deliveryType: "delivery" | "pickup";
  pixCode?: string;
  qrCode?: string;
  expiresAt?: number | null;
  timeline: { status: OrderStatus; at: number }[];
}
export interface Analytics {
  days: number;
  orders: number;
  revenue: number;
  averageTicket: number;
  customers: number;
  source: string;
  weekdays: { name: string; count: number; total: number }[];
  hours: { hour: number; count: number }[];
  daily: { date: string; total: number; count: number }[];
  regions: { name: string; count: number }[];
  products: { id: string; name: string; quantity: number; total: number }[];
}
export interface Dashboard {
  analytics: Analytics;
  orders: Order[];
  products: Product[];
  customers: {
    name: string;
    email: string;
    phone: string;
    region: string;
    orders: number;
    spent: number;
    lastOrder: number;
  }[];
  store: Store;
  aiEnabled: boolean;
  demo: boolean;
}
export interface Bootstrap {
  products: Product[];
  store: Store;
  user: User | null;
  csrf: string;
  demo: boolean;
  paymentMode: string;
  aiEnabled: boolean;
}
