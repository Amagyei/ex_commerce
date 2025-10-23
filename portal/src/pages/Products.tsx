import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";
import { ProductsApi } from "@/lib/api/products";
import { CartApi } from "@/lib/api/cart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import heroImage from "@/assets/hero-ecommerce.jpg";

export default function Products() {
  console.log('🛍️ PRODUCTS: Component function called');
  
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => ProductsApi.getProducts({ limit: 20 }),
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('🛍️ PRODUCTS: React Query error:', error);
    },
    onSuccess: (data) => {
      console.log('🛍️ PRODUCTS: React Query success:', data);
    }
  });

  console.log('🛍️ PRODUCTS: Component rendered');
  console.log('🛍️ PRODUCTS: isLoading:', isLoading);
  console.log('🛍️ PRODUCTS: error:', error);
  console.log('🛍️ PRODUCTS: productsData:', productsData);

  const products = productsData?.products || [];
  console.log('🛍️ PRODUCTS: products:', products);
  console.log('🛍️ PRODUCTS: products.length:', products.length);

  // Add error boundary logging
  if (error) {
    console.error('🛍️ PRODUCTS: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }

  const handleAddToCart = async (product: Product) => {
    console.log('🛍️ PRODUCTS: Adding to cart:', product);
    try {
      const result = await CartApi.addToCart(product.item_code, 1);
      console.log('🛍️ PRODUCTS: Add to cart result:', result);
      toast.success(`${product.item_name} added to cart`);
    } catch (error) {
      console.error('🛍️ PRODUCTS: Add to cart error:', error);
      toast.error('Failed to add item to cart');
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Store Hero"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/40" />
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Discover Amazing Products
            </h1>
            <p className="text-lg text-foreground/80 mb-6">
              Shop the latest collection with unbeatable quality and prices
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load products. Please try again.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.item_code}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </ErrorBoundary>
  );
}
