import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Package } from "lucide-react";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const fetchProductDetail = async (itemCode: string): Promise<Product> => {
  // Mock data - replace with actual API call
  return {
    name: "Product 1",
    item_code: itemCode,
    item_name: "Premium Wireless Headphones",
    description: "Experience premium sound quality with our state-of-the-art wireless headphones. Featuring advanced noise cancellation technology, comfortable over-ear design, and up to 30 hours of battery life. Perfect for music lovers, travelers, and professionals who demand the best audio experience.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    price: 299.99,
    in_stock: true,
    stock_qty: 45,
    category: "Electronics",
    brand: "AudioTech",
  };
};

export default function ProductDetail() {
  const { itemCode } = useParams<{ itemCode: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', itemCode],
    queryFn: () => fetchProductDetail(itemCode!),
    enabled: !!itemCode,
  });

  const handleAddToCart = () => {
    if (product) {
      toast.success(`${product.item_name} added to cart`);
      // Add cart logic here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
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
                disabled={!product.in_stock}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
