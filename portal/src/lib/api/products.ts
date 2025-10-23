import { frappeApi, endpoints, ProductsResponse, ProductResponse } from '../api';
import type { Product } from '@/types/product';

// Products API Service
export class ProductsApi {
  /**
   * Get products with pagination and optional filters
   */
  static async getProducts(params: {
    limit?: number;
    offset?: number;
    search?: string;
    category?: string;
  } = {}): Promise<ProductsResponse> {
    try {
      console.log('🛍️ PRODUCTS_API: getProducts called with params:', params);
      
      const queryParams = new URLSearchParams();
      
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.category) queryParams.append('category', params.category);
      
      const endpoint = `${endpoints.products}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('🛍️ PRODUCTS_API: endpoint:', endpoint);
      
      const response = await frappeApi.get<{ message: ProductsResponse }>(endpoint);
      console.log('🛍️ PRODUCTS_API: response:', response);
      
      const result = response.message;
      console.log('🛍️ PRODUCTS_API: unwrapped result:', result);
      
      return result;
    } catch (error) {
      console.error('🛍️ PRODUCTS_API: Error in getProducts:', error);
      throw error;
    }
  }

  /**
   * Get single product by item code
   */
  static async getProduct(itemCode: string): Promise<Product> {
    const endpoint = endpoints.productDetail(itemCode);
    const response = await frappeApi.get<{ message: ProductResponse }>(endpoint);
    
    return response.message.product;
  }

  /**
   * Search products by query
   */
  static async searchProducts(query: string, limit = 20): Promise<ProductsResponse> {
    return this.getProducts({
      search: query,
      limit,
      offset: 0,
    });
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string, limit = 20): Promise<ProductsResponse> {
    return this.getProducts({
      category,
      limit,
      offset: 0,
    });
  }
}
