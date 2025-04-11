
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { CartProvider } from './context/CartContext.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './context/AuthContext.tsx'

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);
