import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartApi } from "@/lib/api/cart";
import { toast } from "sonner";

export default function Cart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cartData, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: () => {
      console.log('🛒 CART: Fetching cart data...');
      return CartApi.getCart();
    },
  });

  console.log('🛒 CART: Component rendered');
  console.log('🛒 CART: isLoading:', isLoading);
  console.log('🛒 CART: error:', error);
  console.log('🛒 CART: cartData:', cartData);
  console.log('🛒 CART: cartData?.cart_items:', cartData?.cart_items);

  const cartItems = cartData?.cart_items || [];
  console.log('🛒 CART: cartItems:', cartItems);
  console.log('🛒 CART: cartItems.length:', cartItems.length);

  const updateCartMutation = useMutation({
    mutationFn: ({ itemCode, qty }: { itemCode: string; qty: number }) =>
      CartApi.updateCart(itemCode, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Cart updated');
    },
    onError: () => {
      toast.error('Failed to update cart');
    },
  });

  const removeFromCartMutation = useMutation({
    mutationFn: (itemCode: string) => CartApi.removeFromCart(itemCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Item removed from cart');
    },
    onError: () => {
      toast.error('Failed to remove item');
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => CartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Cart cleared');
    },
    onError: () => {
      toast.error('Failed to clear cart');
    },
  });

  const handleQuantityChange = (itemCode: string, newQty: number) => {
    updateCartMutation.mutate({ itemCode, qty: newQty });
  };

  const handleRemoveItem = (itemCode: string) => {
    removeFromCartMutation.mutate(itemCode);
  };

  const handleClearCart = () => {
    clearCartMutation.mutate();
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">
                Add some items to get started
              </p>
              <Button onClick={() => navigate('/')}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.item_code}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.item_name}</h3>
                        <p className="text-muted-foreground">{item.item_group}</p>
                        <p className="text-lg font-bold text-primary">
                          ₵{item.rate.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.item_code, item.qty - 1)}
                            disabled={item.qty <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.qty}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.item_code, item.qty + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Total for this item */}
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ₵{item.amount.toFixed(2)}
                          </p>
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.item_code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Items ({cartItems.length})</span>
                    <span>₵{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₵{totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button 
                      className="w-full" 
                      onClick={() => navigate('/checkout')}
                    >
                      Proceed to Checkout
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/')}
                    >
                      Continue Shopping
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={handleClearCart}
                    >
                      Clear Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}