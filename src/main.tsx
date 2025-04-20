
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "./components/providers/theme-provider"
import { TranslationProvider } from './context/TranslationContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TranslationProvider>
          <CartProvider>
            <ThemeProvider defaultTheme="light" storageKey="itakecareapp-theme">
              <TooltipProvider>
                <App />
              </TooltipProvider>
            </ThemeProvider>
          </CartProvider>
        </TranslationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
