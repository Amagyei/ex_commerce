import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Search, User, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CartApi } from "@/lib/api/cart";
import { OrdersApi } from "@/lib/api/orders";
import { CustomerLookupApi, CustomerLookupResponse, CustomerAddress } from "@/lib/api/customer-lookup";
import { toast } from "sonner";

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderComplete, setOrderComplete] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  
  // Customer lookup state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerLookup, setCustomerLookup] = useState<CustomerLookupResponse | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);

  // Get cart data
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => CartApi.getCart(),
  });

  const cartItems = cartData?.cart_items || [];
  const totalAmount = cartItems.reduce((sum, item) => sum + item.amount, 0);

  // Customer lookup function
  const handlePhoneLookup = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setIsLookingUp(true);
    try {
      const result = await CustomerLookupApi.lookupByPhone(phoneNumber);
      setCustomerLookup(result);
      
      if (result.success && result.found && result.customer) {
        console.log('🎉 CHECKOUT: Existing customer found:', {
          name: result.customer.name,
          customer_name: result.customer.customer_name,
          email: result.customer.email_id,
          source: result.source
        });
        
        toast.success(`Welcome back, ${result.customer.customer_name}!`);
        
        // Get customer addresses
        const addressesResult = await CustomerLookupApi.getAddresses(result.customer.name);
        if (addressesResult.success) {
          console.log('📍 CHECKOUT: Found addresses:', addressesResult.addresses.length);
          setCustomerAddresses(addressesResult.addresses);
          if (addressesResult.addresses.length > 0) {
            setSelectedAddress(addressesResult.addresses[0]);
          }
        }
        
        setShowForm(true);
      } else {
        console.log('👤 CHECKOUT: New customer - no existing record found');
        toast.info("New customer - please fill in your details");
        setShowForm(true);
      }
    } catch (error) {
      toast.error("Failed to lookup customer");
      console.error("Customer lookup error:", error);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ({ customerInfo, deliveryInfo }: { customerInfo: any; deliveryInfo: any }) =>
      OrdersApi.createOrder(customerInfo, deliveryInfo),
    onSuccess: (data) => {
      setCreatedOrder(data.ex_commerce_sales_order);
      setOrderComplete(true);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Order placed successfully!");
    },
    onError: (error) => {
      toast.error("Failed to place order. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    // Use existing customer data if available, otherwise use form data
    const customerInfo = customerLookup?.found && customerLookup?.customer ? {
      name: customerLookup.customer.customer_name,
      email: customerLookup.customer.email_id || formData.get('email') as string,
      phone: phoneNumber,
    } : {
      name: `${formData.get('firstName')} ${formData.get('lastName')}`,
      email: formData.get('email') as string,
      phone: phoneNumber,
    };

    // Use selected address if available, otherwise use form data
    const deliveryInfo = selectedAddress ? {
      address: `${selectedAddress.address_line1}${selectedAddress.address_line2 ? ', ' + selectedAddress.address_line2 : ''}, ${selectedAddress.city || ''}, ${selectedAddress.state || ''} ${selectedAddress.pincode || ''}`,
      phone: selectedAddress.phone || phoneNumber,
      notes: formData.get('notes') as string || '',
    } : {
      address: `${formData.get('address')}, ${formData.get('city')}, ${formData.get('state')} ${formData.get('zip')}`,
      phone: phoneNumber,
      notes: formData.get('notes') as string || '',
    };

    createOrderMutation.mutate({ customerInfo, deliveryInfo });
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading checkout...</div>
      </div>
    );
  }

  if (cartItems.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add some items to your cart before checkout.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
            <p className="text-muted-foreground mb-2">
              Order #{createdOrder?.name}
            </p>
            <p className="text-muted-foreground mb-2">
              Customer: {createdOrder?.guest_name}
            </p>
            <p className="text-muted-foreground mb-2">
              Total: ₵{createdOrder?.grand_total?.toFixed(2)}
            </p>
            <p className="text-muted-foreground mb-6">
              We'll contact you shortly to confirm delivery details.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                {!showForm ? (
                  // Phone lookup step
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Enter Your Phone Number</h3>
                        <p className="text-muted-foreground">
                          We'll check if you're an existing customer or help you create a new account
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          placeholder="e.g., 0557297891"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="text-lg"
                        />
                      </div>
                      
                      <Button
                        onClick={handlePhoneLookup}
                        disabled={isLookingUp || !phoneNumber.trim()}
                        size="lg"
                        className="w-full"
                      >
                        {isLookingUp ? (
                          <>
                            <Search className="w-4 h-4 mr-2 animate-spin" />
                            Looking up...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Look Up Customer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Customer form step
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {customerLookup?.found && customerLookup?.customer ? (
                      // Existing customer
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 text-green-800">
                            <User className="w-5 h-5" />
                            <span className="font-semibold">Welcome back, {customerLookup.customer.customer_name}!</span>
                          </div>
                          {customerLookup.customer.email_id && (
                            <div className="flex items-center space-x-2 text-green-700 mt-2">
                              <Mail className="w-4 h-4" />
                              <span className="text-sm">{customerLookup.customer.email_id}</span>
                            </div>
                          )}
                        </div>
                        
                        {customerAddresses.length > 0 && (
                          <div className="space-y-2">
                            <Label>Select Delivery Address</Label>
                            <div className="space-y-2">
                              {customerAddresses.map((address) => (
                                <div 
                                  key={address.name}
                                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                    selectedAddress?.name === address.name 
                                      ? 'border-primary bg-primary/5' 
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                  onClick={() => setSelectedAddress(address)}
                                >
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">{address.address_type}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {address.address_line1}
                                        {address.address_line2 && `, ${address.address_line2}`}
                                        {address.city && `, ${address.city}`}
                                        {address.state && `, ${address.state}`}
                                        {address.pincode && ` ${address.pincode}`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // New customer form
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 text-blue-800">
                            <User className="w-5 h-5" />
                            <span className="font-semibold">New Customer - Please fill in your details</span>
                          </div>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" name="firstName" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" name="lastName" required />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" required />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Delivery Address</Label>
                          <Textarea id="address" name="address" required rows={3} />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" name="city" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input id="state" name="state" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="zip">ZIP Code</Label>
                            <Input id="zip" name="zip" required />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                      <Textarea 
                        id="notes" 
                        name="notes" 
                        rows={2} 
                        placeholder="Any special delivery instructions..." 
                      />
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setCustomerLookup(null);
                          setCustomerAddresses([]);
                          setSelectedAddress(null);
                        }}
                        className="flex-1"
                      >
                        Back to Phone Lookup
                      </Button>
                      
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? "Creating Order..." : "Place Order"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.item_code} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.qty}</p>
                      </div>
                      <span className="font-medium">₵{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₵{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium">Contact for pricing</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">₵{totalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      * Final price will be confirmed after contact
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
