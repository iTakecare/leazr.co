import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('🚨 ERROR BOUNDARY WRAPPER - Component crashed:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      componentStack: errorInfo?.componentStack?.substring(0, 300)
    });
    
    // Handle storage errors gracefully
    if (error.message.includes('storage') || error.message.includes('localStorage')) {
      console.warn('⚠️ Storage error detected, attempting to continue without storage');
      // Try to clear problematic storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (clearError) {
        console.warn('Could not clear storage:', clearError);
      }
    }
  };

  return (
    <ErrorBoundary fallback={({ error, errorInfo }) => {
      handleError(error, errorInfo);
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold mb-2">Oops, une erreur s'est produite</h2>
            <p className="text-muted-foreground mb-4">
              Une erreur technique s'est produite. Veuillez rafraîchir la page.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-primary-foreground px-4 py-2 rounded"
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      );
    }}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundaryWrapper;