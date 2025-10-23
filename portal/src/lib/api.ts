import { frappeRequest } from './frappe-auth';

// API Configuration - Use relative URLs to automatically connect to the same host
// This follows the same pattern as Frappe's urllib.get_base_url()
const API_BASE_URL = '';

// API Response Types
export interface ApiResponse<T> {
  message: T;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface ProductResponse {
  product: Product;
}

// API Helper Functions
export const frappeApi = {
  async get<T>(endpoint: string): Promise<T> {
    console.log('🌐 FRAPPE_API: GET request to:', `${API_BASE_URL}${endpoint}`);
    const response = await frappeRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
    });
    
    console.log('🌐 FRAPPE_API: GET response status:', response.status);
    console.log('🌐 FRAPPE_API: GET response ok:', response.ok);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🌐 FRAPPE_API: GET error:', errorData);
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }
    
    const jsonData = await response.json();
    console.log('🌐 FRAPPE_API: GET response data:', jsonData);
    return jsonData;
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    console.log('🌐 FRAPPE_API: POST request to:', `${API_BASE_URL}${endpoint}`);
    console.log('🌐 FRAPPE_API: POST data:', data);
    const response = await frappeRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    console.log('🌐 FRAPPE_API: POST response status:', response.status);
    console.log('🌐 FRAPPE_API: POST response ok:', response.ok);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🌐 FRAPPE_API: POST error:', errorData);
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }
    
    const jsonData = await response.json();
    console.log('🌐 FRAPPE_API: POST response data:', jsonData);
    return jsonData;
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await frappeRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }
    
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const response = await frappeRequest(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.statusText}`);
    }
    
    return response.json();
  },
};

// API Endpoints
export const endpoints = {
	// Products
	products: '/api/method/ex_commerce.ex_commerce.api.products.get_products',
	productDetail: (itemCode: string) => `/api/method/ex_commerce.ex_commerce.api.products.get_product?item_code=${itemCode}`,

	// Cart
	cart: '/api/method/ex_commerce.ex_commerce.api.cart.get_cart',
	addToCart: '/api/method/ex_commerce.ex_commerce.api.cart.add_to_cart',
	updateCart: '/api/method/ex_commerce.ex_commerce.api.cart.update_cart',
	removeFromCart: '/api/method/ex_commerce.ex_commerce.api.cart.remove_from_cart',
	clearCart: '/api/method/ex_commerce.ex_commerce.api.cart.clear_cart',

	// Orders
	createOrder: '/api/method/ex_commerce.ex_commerce.api.orders.create_order',
	getOrder: (orderId: string) => `/api/method/ex_commerce.ex_commerce.api.orders.get_order?order_id=${orderId}`,
	getOrderStatus: (orderId: string) => `/api/method/ex_commerce.ex_commerce.api.orders.get_order_status?order_id=${orderId}`,
};
