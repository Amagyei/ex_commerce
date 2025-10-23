import { frappeApi, endpoints } from '../api';
import type { CartItem } from '@/types/product';

export interface CartResponse {
	cart_items: CartItem[];
	total_items: number;
}

export interface CartItemResponse {
	message: string;
	cart_items: CartItem[];
	total_items: number;
}

export const CartApi = {
	async getCart(): Promise<CartResponse> {
		console.log('🛒 CART_API: getCart called');
		console.log('🛒 CART_API: endpoint:', endpoints.cart);
		const response = await frappeApi.get<{ message: CartResponse }>(endpoints.cart);
		console.log('🛒 CART_API: getCart response:', response);
		return response.message;
	},

	async addToCart(itemCode: string, qty: number = 1): Promise<CartItemResponse> {
		console.log('🛒 CART_API: addToCart called', { itemCode, qty });
		console.log('🛒 CART_API: endpoint:', endpoints.addToCart);
		const response = await frappeApi.post<CartItemResponse>(endpoints.addToCart, {
			item_code: itemCode,
			qty: qty
		});
		console.log('🛒 CART_API: addToCart response:', response);
		return response;
	},

	async updateCart(itemCode: string, qty: number): Promise<CartItemResponse> {
		const response = await frappeApi.post<CartItemResponse>(endpoints.updateCart, {
			item_code: itemCode,
			qty: qty
		});
		return response;
	},

	async removeFromCart(itemCode: string): Promise<CartItemResponse> {
		const response = await frappeApi.post<CartItemResponse>(endpoints.removeFromCart, {
			item_code: itemCode
		});
		return response;
	},

	async clearCart(): Promise<CartItemResponse> {
		const response = await frappeApi.post<CartItemResponse>(endpoints.clearCart, {});
		return response;
	},
};

