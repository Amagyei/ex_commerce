import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CartApi } from "@/lib/api/cart";
import { OrdersApi } from "@/lib/api/orders";
import { toast } from "sonner";

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orderComplete, setOrderComplete] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  // Get cart data
  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => CartApi.getCart(),
  });

  const cartItems = cartData?.cart_items || [];
  const totalAmount = cartItems.reduce((sum, item) => sum + item.amount, 0);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ({ customerInfo, deliveryInfo }: { customerInfo: any; deliveryInfo: any }) =>
      OrdersApi.createOrder(customerInfo, deliveryInfo),
    onSuccess: (data) => {
      setCreatedOrder(data.sales_order);
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
    
    const customerInfo = {
      name: `${formData.get('firstName')} ${formData.get('lastName')}`,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    const deliveryInfo = {
      address: `${formData.get('address')}, ${formData.get('city')}, ${formData.get('state')} ${formData.get('zip')}`,
      phone: formData.get('phone') as string,
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
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Textarea id="address" required rows={3} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                    <Textarea id="notes" rows={2} placeholder="Any special delivery instructions..." />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input id="state" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input id="zip" required />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? "Creating Order..." : "Place Order"}
                  </Button>
                </form>
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
