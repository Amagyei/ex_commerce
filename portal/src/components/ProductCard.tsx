import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import type{ Product } from "@/types/product";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter } from "./ui/card";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const imageUrl =
    product.image ||
    product.first_available_variant_image ||
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400";
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card)] hover:border-primary/20">
      <Link to={`/product/${product.item_code}`}>
        <div className="aspect-square overflow-hidden bg-secondary">
          <img
            src={imageUrl}
            alt={product.item_name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      </Link>
      <CardContent className="p-4">
        <Link to={`/product/${product.item_code}`}>
          <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors line-clamp-1">
            {product.item_name}
          </h3>
        </Link>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {product.description}
          </p>
        )}
        {product.has_variants ? (
          <p className="text-xl font-bold text-primary">
            {product.min_price !== undefined
              ? `From ₵${product.min_price.toFixed(2)}`
              : 'From ₵—'}
          </p>
        ) : (
          <p className="text-xl font-bold text-primary">
            {product.formatted_price || `₵${product.price?.toFixed(2) || '0.00'}`}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={() => onAddToCart(product)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {product.has_variants ? 'View Options' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
};
