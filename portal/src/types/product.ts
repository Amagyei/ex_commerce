export interface Product {
  name: string;
  item_code: string;
  item_name: string;
  description?: string;
  image?: string;
  price?: number;
  formatted_price?: string;
  in_stock?: boolean;
  category?: string;
  brand?: string;
}

export interface CartItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  total_qty: number;
}

export interface Order {
  customer_name: string;
  email: string;
  phone?: string;
  shipping_address: string;
  items: Array<{
    item_code: string;
    qty: number;
  }>;
}

export interface OrderResponse {
  name: string;
  status: string;
  message?: string;
}
