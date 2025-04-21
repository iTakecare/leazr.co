
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "./components/providers/theme-provider"
import { installDatabaseFunctions } from './utils/dbFunctions'

// Initialize database functions if needed
try {
  installDatabaseFunctions().catch(err => {
    console.warn("Failed to install database functions:", err);
  });
} catch (error) {
  console.warn("Error during database function installation check:", error);
}

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
        <CartProvider>
          <ThemeProvider defaultTheme="light" storageKey="itakecareapp-theme">
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
