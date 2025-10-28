import { frappeRequest } from '../frappe-auth';

export interface CustomerLookupResponse {
  success: boolean;
  found?: boolean;
  customer?: {
    name: string;
    customer_name: string;
    email_id?: string;
    mobile_no?: string;
    customer_type?: string;
    customer_group?: string;
    territory?: string;
  };
  contact?: {
    name: string;
    first_name: string;
    last_name: string;
    mobile_no?: string;
    email_id?: string;
  };
  address?: {
    name: string;
    address_title: string;
    address_type: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    country: string;
    pincode?: string;
    phone: string;
  };
  source?: string;
  message?: string;
  error?: string;
}

export interface CustomerAddress {
  name: string;
  address_type: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email_id?: string;
}

export interface CustomerAddressesResponse {
  success: boolean;
  addresses: CustomerAddress[];
  error?: string;
}

export const CustomerLookupApi = {
  /**
   * Look up customer by phone number
   */
  async lookupByPhone(phoneNumber: string): Promise<CustomerLookupResponse> {
    try {
      console.log('🔍 CUSTOMER_LOOKUP: Looking up customer by phone:', phoneNumber);
      
      const response = await frappeRequest(
        `/api/method/ex_commerce.ex_commerce.api.customer_lookup.lookup_customer_by_phone?phone_number=${encodeURIComponent(phoneNumber)}`
      );
      
      console.log('🔍 CUSTOMER_LOOKUP: Raw Response:', response);
      
      // Parse the response if it's a Response object
      let data;
      if (response instanceof Response) {
        data = await response.json();
      } else {
        data = response;
      }
      
      console.log('🔍 CUSTOMER_LOOKUP: Parsed Data:', data);
      
      // Extract the message from Frappe API response
      const result = data.message || data;
      
      if (result.success && result.found && result.customer) {
        console.log('✅ CUSTOMER_LOOKUP: Customer found:', {
          name: result.customer.name,
          customer_name: result.customer.customer_name,
          email: result.customer.email_id,
          source: result.source
        });
      } else {
        console.log('❌ CUSTOMER_LOOKUP: No customer found for phone:', phoneNumber);
      }
      
      return result;
    } catch (error) {
      console.error('🔍 CUSTOMER_LOOKUP: Error:', error);
      return {
        success: false,
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get customer addresses
   */
  async getAddresses(customerName: string): Promise<CustomerAddressesResponse> {
    try {
      console.log('🔍 CUSTOMER_LOOKUP: Getting addresses for customer:', customerName);
      
      const response = await frappeRequest(
        `/api/method/ex_commerce.ex_commerce.api.customer_lookup.get_customer_addresses?customer_name=${encodeURIComponent(customerName)}`
      );
      
      console.log('🔍 CUSTOMER_LOOKUP: Addresses response:', response);
      
      // Parse the response if it's a Response object
      let data;
      if (response instanceof Response) {
        data = await response.json();
      } else {
        data = response;
      }
      
      // Extract the message from Frappe API response
      const result = data.message || data;
      
      return result;
    } catch (error) {
      console.error('🔍 CUSTOMER_LOOKUP: Error getting addresses:', error);
      return {
        success: false,
        addresses: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Create customer with contact and address from checkout form data
   */
  async createCustomer(customerData: {
    customer_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    pincode?: string;
    country?: string;
  }): Promise<CustomerLookupResponse> {
    try {
      console.log('👤 CUSTOMER_CREATE: Creating customer with details:', customerData);
      
      const response = await frappeRequest(
        `/api/method/ex_commerce.ex_commerce.api.customer_creation.create_customer_with_details`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_data: JSON.stringify(customerData)
          })
        }
      );
      
      console.log('👤 CUSTOMER_CREATE: Raw Response:', response);
      
      // Parse the response if it's a Response object
      let data;
      if (response instanceof Response) {
        data = await response.json();
      } else {
        data = response;
      }
      
      console.log('👤 CUSTOMER_CREATE: Parsed Data:', data);
      
      // Extract the message from Frappe API response
      const result = data.message || data;
      
      if (result.success && result.customer) {
        console.log('✅ CUSTOMER_CREATE: Customer created successfully:', {
          customer_id: result.customer.name,
          customer_name: result.customer.customer_name,
          contact_id: result.contact?.name,
          address_id: result.address?.name
        });
      } else {
        console.log('❌ CUSTOMER_CREATE: Failed to create customer:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('👤 CUSTOMER_CREATE: Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};
