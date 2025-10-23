// Example API configuration
// Copy this file to api.config.ts and fill in your Frappe details

export const apiConfig = {
  // Your Frappe instance URL
  baseUrl: 'https://your-frappe-instance.com',
  
  // Your API credentials
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  
  // Optional: Custom endpoints if your Frappe setup differs
  endpoints: {
    products: '/api/method/erpnext.e_commerce.shopping_cart.product.get_product_filter_data',
    productDetail: '/api/resource/Item',
    createOrder: '/api/method/erpnext.e_commerce.shopping_cart.cart.place_order',
    cart: '/api/method/erpnext.e_commerce.shopping_cart.cart.get_cart_quotation',
    addToCart: '/api/method/erpnext.e_commerce.shopping_cart.cart.update_cart',
  }
};
