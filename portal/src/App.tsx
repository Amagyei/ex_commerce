import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { bootstrapFrappeUiAuth } from "@/lib/frappe-auth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Bootstrap Frappe UI auth on app start with error handling
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🚀 APP: Initializing authentication...');
        const authSuccess = await bootstrapFrappeUiAuth();
        
        if (authSuccess) {
          console.log('✅ APP: Authentication successful');
        } else {
          console.warn('⚠️ APP: Authentication failed, but app will continue with limited functionality');
          // Show user-friendly message
          console.log('💡 APP: Some features may not work without proper authentication');
        }
      } catch (error) {
        console.error('❌ APP: Authentication initialization failed:', error);
        console.log('💡 APP: App will continue with limited functionality');
      }
    };
    
    initializeAuth();
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;
