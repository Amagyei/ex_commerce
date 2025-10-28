import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProductsApi } from "@/lib/api/products";
import { CartApi } from "@/lib/api/cart";

export default function ProductDetail() {
  const { itemCode } = useParams<{ itemCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', itemCode],
    queryFn: () => ProductsApi.getProduct(itemCode!),
    enabled: !!itemCode,
  });

  const addToCartMutation = useMutation({
    mutationFn: (itemCode: string) => CartApi.addToCart(itemCode, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(`${product?.item_name} added to cart`);
    },
    onError: (error) => {
      console.error('🛍️ PRODUCTS: Add to cart error:', error);
      toast.error("Failed to add item to cart");
    }
  });

  const handleAddToCart = () => {
    if (product && product.item_code) {
      addToCartMutation.mutate(product.item_code);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading product details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error loading product</h2>
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button onClick={() => navigate('/')}>Back to Products</Button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button onClick={() => navigate('/')}>Back to Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-secondary shadow-[var(--shadow-card)]">
            <img
              src={product.image}
              alt={product.item_name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-2 text-sm text-muted-foreground">
              {product.category} {product.brand && `• ${product.brand}`}
            </div>
            
            <h1 className="text-4xl font-bold mb-4">{product.item_name}</h1>
            
            <div className="text-3xl font-bold text-primary mb-6">
              ₵{product.price?.toFixed(2)}
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {product.in_stock ? (
                  <span className="text-green-600 font-medium">
                    In Stock ({product.stock_qty} available)
                  </span>
                ) : (
                  <span className="text-destructive font-medium">Out of Stock</span>
                )}
              </span>
            </div>

            <p className="text-muted-foreground mb-8 leading-relaxed">
              {product.description}
            </p>

            <div className="mt-auto">
              <Button
                size="lg"
                className="w-full md:w-auto"
                onClick={handleAddToCart}
                disabled={!product.in_stock || addToCartMutation.isPending}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {addToCartMutation.isPending ? 'Adding...' : product.in_stock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
