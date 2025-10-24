import { frappeApi, endpoints } from '../api';

export interface CustomerInfo {
	name: string;
	email?: string;
	phone: string;
}

export interface DeliveryInfo {
	address: string;
	phone: string;
	notes?: string;
}

export interface OrderItem {
	item_code: string;
	item_name: string;
	qty: number;
	rate: number;
	amount: number;
}

export interface SalesOrder {
	name: string;
	status: string;
	customer: string;
	transaction_date: string;
	delivery_date: string;
	total: number;
	grand_total: number;
	items: OrderItem[];
	notes?: string;
}

export interface OrderResponse {
	message: string;
	ex_commerce_sales_order: {
		name: string;
		status: string;
		total: number;
		grand_total: number;
		guest_name: string;
		guest_email: string;
		guest_phone: string;
		transaction_date: string;
		delivery_date: string;
	};
}

export interface GetOrderResponse {
	order: SalesOrder;
}

export interface OrderStatusResponse {
	order_id: string;
	status: string;
}

export const OrdersApi = {
	async createOrder(customerInfo: CustomerInfo, deliveryInfo: DeliveryInfo): Promise<OrderResponse> {
		const response = await frappeApi.post<OrderResponse>(endpoints.createOrder, {
			customer_info: customerInfo,
			delivery_info: deliveryInfo
		});
		return response;
	},

	async getOrder(orderId: string): Promise<GetOrderResponse> {
		const response = await frappeApi.get<GetOrderResponse>(endpoints.getOrder(orderId));
		return response;
	},

	async getOrderStatus(orderId: string): Promise<OrderStatusResponse> {
		const response = await frappeApi.get<OrderStatusResponse>(endpoints.getOrderStatus(orderId));
		return response;
	},
};

