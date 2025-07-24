import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Container from '@/components/layout/Container';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log simplified error info for Safari compatibility
    console.error('🚨 ERROR BOUNDARY - Component crashed:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      componentStack: errorInfo.componentStack?.substring(0, 300),
      userAgent: navigator.userAgent?.substring(0, 100),
      url: window.location.href
    });

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} errorInfo={this.state.errorInfo} />;
      }

      return (
        <Container>
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Une erreur inattendue s'est produite.
              <br />
              <small className="text-xs">
                {this.state.error?.message || 'Erreur inconnue'}
              </small>
              <br />
              <button 
                onClick={() => this.setState({ hasError: false })} 
                className="mt-2 text-xs underline"
              >
                Réessayer
              </button>
            </AlertDescription>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;