
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CompanyBrandingProvider } from './context/CompanyBrandingContext'
import App from './App.tsx'
import './index.css'

// Créer une instance du QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CompanyBrandingProvider>
        <App />
      </CompanyBrandingProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
