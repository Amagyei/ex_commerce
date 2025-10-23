import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { bootstrapFrappeUiAuth } from "@/lib/frappe-auth";
import { Header } from "./components/Header";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Bootstrap Frappe UI auth on app start
  useEffect(() => {
    bootstrapFrappeUiAuth();
  }, []);

  // Add global error handler
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('🚨 GLOBAL ERROR:', error);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 UNHANDLED PROMISE REJECTION:', event);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/portal">
                <Header />
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/product/:itemCode" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
