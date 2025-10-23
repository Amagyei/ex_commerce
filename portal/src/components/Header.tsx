import { ShoppingCart, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CartApi } from "@/lib/api/cart";

export const Header = () => {
  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => CartApi.getCart(),
  });

  const cartItemCount = cartData?.total_items || 0;
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Store className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Ex Commerce</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            Products
          </Link>
          <Link to="/cart" className="relative">
            <Button variant="outline" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge 
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  variant="default"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};
